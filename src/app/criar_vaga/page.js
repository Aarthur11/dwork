'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from '@/app/criar_vaga/criar_vaga.module.css';
import Menu from '@/app/Componentes/Menu';
import { categoria as categorias } from '@/app/dados/dados_categorias';

const MAX_FOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

export default function CriarVaga() {
    const router = useRouter();
    const inputFotos = useRef(null);

    const [titulo, setTitulo] = useState('');
    const [categoria, setCategoria] = useState('');
    const [descricao, setDescricao] = useState('');
    const [urgente, setUrgente] = useState(false);
    const [fotos, setFotos] = useState([]);
    const [erro, setErro] = useState('');
    const [enviando, setEnviando] = useState(false);

    // miniaturas das fotos escolhidas (e libera a memória quando mudam)
    const previas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
    useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas]);

    function escolherFotos(e) {
        setErro('');
        const novas = Array.from(e.target.files ?? []);
        e.target.value = ''; // permite escolher a mesma foto de novo depois de remover

        for (const f of novas) {
            if (!FORMATOS.includes(f.type)) {
                setErro('Use fotos JPG, PNG ou WEBP.');
                return;
            }
            if (f.size > MAX_BYTES) {
                setErro('Cada foto deve ter até 5 MB.');
                return;
            }
        }
        if (fotos.length + novas.length > MAX_FOTOS) {
            setErro(`Você pode enviar no máximo ${MAX_FOTOS} fotos.`);
            return;
        }
        setFotos((atuais) => [...atuais, ...novas]);
    }

    function removerFoto(indice) {
        setFotos((atuais) => atuais.filter((_, i) => i !== indice));
    }

    async function enviar(e) {
        e.preventDefault();
        setErro('');

        if (!titulo.trim() || !categoria || !descricao.trim()) {
            setErro('Preencha todos os campos.');
            return;
        }

        const form = new FormData();
        form.append('titulo', titulo);
        form.append('categoria', categoria);
        form.append('descricao', descricao);
        form.append('urgente', String(urgente));
        fotos.forEach((f) => form.append('fotos', f));

        setEnviando(true);
        try {
            // sem o header Content-Type: o navegador define sozinho para FormData
            const res = await fetch('/api/criar_vaga', { method: 'POST', body: form });
            const dados = await res.json().catch(() => ({}));

            if (res.status === 401) {
                router.push('/login');
                return;
            }
            if (!res.ok) {
                setErro(dados.erro || 'Não foi possível criar a vaga.');
                return;
            }

            router.push(`/visualizar_vaga/${dados.id}`);
        } catch (err) {
            console.error('Falha ao criar vaga:', err);
            setErro('Erro de conexão com servidor.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className={styles.container}>

            <header className={styles.header}>
                <button type="button" className={styles.voltar} onClick={() => router.back()} aria-label="Voltar">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </button>
                <h1 className={styles.titulo}>Criar vaga</h1>
            </header>

            <main className={styles.main}>
                <form className={styles.form} onSubmit={enviar} noValidate>

                    <label className={styles.campo}>
                        <span>Título</span>
                        <input
                            type="text"
                            value={titulo}
                            maxLength={220}
                            placeholder="Ex.: Instalação de quadro de distribuição"
                            onChange={(e) => setTitulo(e.target.value)}
                        />
                    </label>

                    <label className={styles.campo}>
                        <span>Categoria</span>
                        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                            <option value="">Selecione</option>
                            {categorias.map((c) => (
                                <option key={c.id} value={c.nome}>{c.nome}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.campo}>
                        <span>Descrição do serviço</span>
                        <textarea
                            rows={5}
                            value={descricao}
                            placeholder="Conte o que precisa ser feito"
                            onChange={(e) => setDescricao(e.target.value)}
                        />
                    </label>

                    <div className={styles.campo}>
                        <span>Fotos (opcional, até {MAX_FOTOS})</span>

                        <input
                            ref={inputFotos}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            hidden
                            onChange={escolherFotos}
                        />

                        <div className={styles.fotos}>
                            {previas.map((url, i) => (
                                <div key={url} className={styles.foto}>
                                    <img src={url} alt={`Foto ${i + 1}`} />
                                    <button
                                        type="button"
                                        className={styles.removerFoto}
                                        onClick={() => removerFoto(i)}
                                        aria-label={`Remover foto ${i + 1}`}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            {fotos.length < MAX_FOTOS && (
                                <button
                                    type="button"
                                    className={styles.adicionarFoto}
                                    onClick={() => inputFotos.current?.click()}
                                >
                                    <span>+</span>
                                    Adicionar
                                </button>
                            )}
                        </div>
                    </div>



                    {erro && <p className={styles.erro}>{erro}</p>}

                    <button type="submit" className={styles.botao} disabled={enviando}>
                        {enviando ? 'Publicando...' : 'Publicar vaga'}
                    </button>
                </form>
            </main>

            <footer>
                <Menu />
            </footer>
        </div>
    );
}