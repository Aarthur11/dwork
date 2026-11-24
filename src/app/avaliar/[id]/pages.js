'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import styles from '@/app/avaliar/[id]/avaliar.module.css';
import Menu from '@/app/Componentes/Menu';

const MAX_TEXTO = 220;
const MAX_BYTES = 5 * 1024 * 1024;
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

function iniciais(nome = '') {
    return nome.split(' ').filter(Boolean).slice(0, 2)
        .map((p) => p[0].toUpperCase()).join('');
}

function Icone({ nome, className }) {
    const caminhos = {
        voltar: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
        check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
        camera: 'M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        estrelaVazia: 'm22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
        estrelaCheia: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    };

    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="currentColor" aria-hidden="true">
            <path d={caminhos[nome]} />
        </svg>
    );
}

export default function Avaliar() {
    const { id } = useParams();
    const router = useRouter();
    const inputFoto = useRef(null);

    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erroPagina, setErroPagina] = useState('');

    const [estrelas, setEstrelas] = useState(0);
    const [sobre, setSobre] = useState(0); // estrela sob o mouse
    const [texto, setTexto] = useState('');
    const [foto, setFoto] = useState(null);
    const [erro, setErro] = useState('');
    const [enviando, setEnviando] = useState(false);

    const previa = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
    useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);

    useEffect(() => {
        const controle = new AbortController();

        async function carregar() {
            try {
                const res = await fetch(`/api/avaliar/${id}`, {
                    signal: controle.signal,
                    cache: 'no-store',
                });

                if (res.status === 401) {
                    router.push('/login');
                    return;
                }

                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setErroPagina(json.erro || 'Erro ao carregar a avaliação.');
                    return;
                }
                setDados(json);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Falha ao carregar avaliação:', e);
                    setErroPagina('Erro de conexão com servidor.');
                }
            } finally {
                if (!controle.signal.aborted) setCarregando(false);
            }
        }

        carregar();
        return () => controle.abort();
    }, [id, router]);

    function escolherFoto(e) {
        setErro('');
        const arquivo = e.target.files?.[0];
        e.target.value = '';
        if (!arquivo) return;

        if (!FORMATOS.includes(arquivo.type)) {
            setErro('Use uma foto JPG, PNG ou WEBP.');
            return;
        }
        if (arquivo.size > MAX_BYTES) {
            setErro('A foto deve ter até 5 MB.');
            return;
        }
        setFoto(arquivo);
    }

    async function enviar(e) {
        e.preventDefault();
        setErro('');

        if (estrelas < 1) {
            setErro('Escolha de 1 a 5 estrelas.');
            return;
        }

        const form = new FormData();
        form.append('estrelas', String(estrelas));
        form.append('descricao', texto.trim());
        if (foto) form.append('foto', foto);

        setEnviando(true);
        try {
            const res = await fetch(`/api/avaliar/${id}`, { method: 'POST', body: form });
            const json = await res.json().catch(() => ({}));

            if (res.status === 401) {
                router.push('/login');
                return;
            }
            if (!res.ok) {
                setErro(json.erro || 'Não foi possível enviar a avaliação.');
                return;
            }

            router.push('/meus_servicos');
        } catch (err) {
            console.error('Falha ao enviar avaliação:', err);
            setErro('Erro de conexão com servidor.');
        } finally {
            setEnviando(false);
        }
    }

    const destaque = sobre || estrelas;

    return (
        <div className={styles.container}>

            <header className={styles.header}>
                <button type="button" className={styles.voltar} onClick={() => router.back()} aria-label="Voltar">
                    <Icone nome="voltar" className={styles.iconeVoltar} />
                </button>
                <h1 className={styles.titulo}>Serviço concluído</h1>
            </header>

            <main className={styles.main}>
                {carregando && <p className={styles.aviso}>Carregando...</p>}
                {!carregando && erroPagina && <p className={styles.aviso}>{erroPagina}</p>}

                {!carregando && !erroPagina && dados && (
                    <>
                        <div className={styles.topo}>
                            <span className={styles.check}>
                                <Icone nome="check" className={styles.iconeCheck} />
                            </span>
                            <h2 className={styles.tudoPronto}>Tudo pronto!</h2>
                            <p className={styles.subtitulo}>
                                O serviço “{dados.titulo}” foi marcado como concluído.
                            </p>
                        </div>

                        <section className={styles.pessoa}>
                            <div className={styles.pessoaTopo}>
                                <span className={styles.avatar}>{iniciais(dados.outro.nome)}</span>
                                <div>
                                    <strong>{dados.outro.nome}</strong>
                                    <span>{dados.outro.descricao}</span>
                                </div>
                            </div>
                            <div className={styles.pessoaRodape}>
                                <span>{new Date(dados.data).toLocaleDateString('pt-BR')}</span>
                                <span>#DW-{dados.id.slice(0, 5).toUpperCase()}</span>
                            </div>
                        </section>

                        {dados.jaAvaliou ? (
                            <p className={styles.jaAvaliou}>Você já avaliou este serviço. Obrigado!</p>
                        ) : (
                            <form className={styles.avaliacao} onSubmit={enviar} noValidate>
                                <h3>Como foi sua experiência?</h3>
                                <p className={styles.ajuda}>Sua avaliação ajuda toda a comunidade.</p>

                                <div className={styles.estrelas} onMouseLeave={() => setSobre(0)}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            className={styles.estrela}
                                            onMouseEnter={() => setSobre(n)}
                                            onClick={() => setEstrelas(n)}
                                            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                                            aria-pressed={estrelas === n}
                                        >
                                            <Icone
                                                nome={n <= destaque ? 'estrelaCheia' : 'estrelaVazia'}
                                                className={styles.iconeEstrela}
                                            />
                                        </button>
                                    ))}
                                </div>

                                <div className={styles.caixa}>
                                    <textarea
                                        rows={4}
                                        value={texto}
                                        maxLength={MAX_TEXTO}
                                        placeholder="Fale sobre o atendimento e a qualidade do serviço"
                                        onChange={(e) => setTexto(e.target.value)}
                                    />
                                    <small>{texto.length}/{MAX_TEXTO}</small>
                                </div>

                                <input
                                    ref={inputFoto}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    onChange={escolherFoto}
                                />

                                {previa ? (
                                    <div className={styles.caixa}>
                                        <div className={styles.previa}>
                                            <img src={previa} alt="Foto da avaliação" />
                                            <button
                                                type="button"
                                                className={styles.removerFoto}
                                                onClick={() => setFoto(null)}
                                                aria-label="Remover foto"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className={`${styles.caixa} ${styles.adicionarFoto}`}
                                        onClick={() => inputFoto.current?.click()}
                                    >
                                        <Icone nome="camera" className={styles.iconeCamera} />
                                        Adicione uma foto
                                    </button>
                                )}

                                {erro && <p className={styles.erro}>{erro}</p>}

                                <button type="submit" className={styles.botao} disabled={enviando}>
                                    {enviando ? 'Enviando...' : 'Enviar avaliação'}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </main>

            <footer>
                <Menu />
            </footer>
        </div>
    );
}