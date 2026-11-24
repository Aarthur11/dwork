'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import styles from '@/app/visualizar_vaga/[id]/visualizar_vaga.module.css';
import Menu from '@/app/Componentes/Menu';
import IniciarChatButton from '@/app/Componentes/IniciarChatButton';

function iniciais(nome = '') {
    return nome.split(' ').filter(Boolean).slice(0, 2)
        .map((p) => p[0].toUpperCase()).join('');
}

// "há 2 horas", "há 3 dias"
function tempoDecorrido(dataISO) {
    const minutos = Math.floor((Date.now() - new Date(dataISO).getTime()) / 60000);
    if (isNaN(minutos) || minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    const dias = Math.floor(horas / 24);
    return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

// "qua., 7 de outubro às 14:30"
function formatarData(dataISO) {
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return '';
    const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dia} às ${hora}`;
}

function Icone({ nome, className }) {
    const caminhos = {
        voltar: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
        estrela: 'm22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
        calendario: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z',
        casa: 'M12 5.69 17 10.19V18h-2v-6H9v6H7v-7.81l5-4.5M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z',
        ferramenta: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
        chat: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H5.17L4 17.17V4h16v12z',
        enviar: 'M2.01 21 23 12 2.01 3 2 10l15 2-15 2z',
        check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
        lixeira: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    };

    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="currentColor" aria-hidden="true">
            <path d={caminhos[nome]} />
        </svg>
    );
}

export default function VisualizarVaga() {
    const { id } = useParams();
    const router = useRouter();

    const [vaga, setVaga] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    const [acao, setAcao] = useState('');       // 'concluindo' ou 'excluindo' enquanto espera
    const [erroAcao, setErroAcao] = useState('');

    useEffect(() => {
        const controle = new AbortController();

        async function carregar() {
            try {
                const res = await fetch(`/api/visualizar_vaga/${id}`, {
                    signal: controle.signal,
                    cache: 'no-store',
                });
                const dados = await res.json().catch(() => ({}));

                if (!res.ok) {
                    setErro(dados.erro || 'Erro ao carregar a vaga.');
                    return;
                }
                setVaga(dados);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Falha ao carregar vaga:', e);
                    setErro('Erro de conexão com servidor.');
                }
            } finally {
                if (!controle.signal.aborted) setCarregando(false);
            }
        }

        carregar();
        return () => controle.abort();
    }, [id]);

    async function executar(metodo, nomeAcao, mensagemErro, destino) {
        setErroAcao('');
        setAcao(nomeAcao);
        try {
            const res = await fetch(`/api/visualizar_vaga/${id}`, { method: metodo });
            const json = await res.json().catch(() => ({}));

            if (res.status === 401) {
                router.push('/login');
                return;
            }
            if (!res.ok) {
                setErroAcao(json.erro || mensagemErro);
                return;
            }

            router.push(destino);
        } catch (e) {
            console.error(mensagemErro, e);
            setErroAcao('Erro de conexão com servidor.');
        } finally {
            setAcao('');
        }
    }

    function concluir() {
        if (!window.confirm('Marcar este serviço como concluído?')) return;
        executar('PATCH', 'concluindo', 'Não foi possível concluir o serviço.', `/avaliar/${id}`);
    }

    function excluir() {
        if (!window.confirm('Excluir esta vaga? Essa ação não pode ser desfeita.')) return;
        executar('DELETE', 'excluindo', 'Não foi possível excluir a vaga.', '/meus_servicos');
    }

    return (
        <div className={styles.container}>

            <header className={styles.header}>
                <button type="button" className={styles.voltar} onClick={() => router.back()} aria-label="Voltar">
                    <Icone nome="voltar" className={styles.iconeVoltar} />
                </button>
                <h1 className={styles.titulo}>Detalhes da vaga</h1>
            </header>

            <main className={styles.main}>
                {carregando && <p className={styles.aviso}>Carregando...</p>}
                {!carregando && erro && <p className={styles.aviso}>{erro}</p>}

                {!carregando && !erro && vaga && (
                    <>
                        <section className={styles.cartao}>
                            <div className={styles.cartaoTopo}>
                                <span className={styles.iconeVaga}>
                                    <Icone nome="ferramenta" className={styles.icone} />
                                </span>
                                <div>
                                    <h2 className={styles.tituloVaga}>{vaga.titulo}</h2>
                                    <p className={styles.publicado}>Publicado {tempoDecorrido(vaga.criadoEm)}</p>
                                </div>
                            </div>

                            <div className={styles.tags}>
                                {vaga.categoria && <span className={styles.tag}>{vaga.categoria}</span>}
                                {vaga.urgente && <span className={`${styles.tag} ${styles.tagUrgente}`}>Urgente</span>}
                                {vaga.concluida && <span className={`${styles.tag} ${styles.tagConcluida}`}>Concluída</span>}
                            </div>
                        </section>

                        <Link href={`/visualizar_perfil/${vaga.autor.id}`} className={styles.autor}>
                            <span className={styles.avatar}>{iniciais(vaga.autor.nome)}</span>
                            <span className={styles.autorInfo}>
                                <strong>{vaga.autor.nome}</strong>
                                <span className={styles.autorNota}>
                                    {vaga.autor.nota !== null ? (
                                        <>
                                            <Icone nome="estrela" className={styles.iconeEstrela} />
                                            <b>{vaga.autor.nota.toFixed(1).replace('.', ',')}</b>
                                            ({vaga.autor.totalAvaliacoes} {vaga.autor.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'})
                                        </>
                                    ) : (
                                        'Ainda sem avaliações'
                                    )}
                                </span>
                            </span>
                        </Link>

                        <h3 className={styles.secao}>Sobre o serviço</h3>
                        <p className={styles.texto}>{vaga.descricao}</p>

                        {vaga.fotos?.length > 0 && (
                            <div className={styles.fotos}>
                                {vaga.fotos.map((url) => (
                                    <a key={url} href={url} target="_blank" rel="noreferrer" className={styles.foto}>
                                        <img src={url} alt="Foto da vaga" />
                                    </a>
                                ))}
                            </div>
                        )}

                        <ul className={styles.detalhes}>
                            <li>
                                <Icone nome="calendario" className={styles.iconeDetalhe} />
                                Publicada em {formatarData(vaga.criadoEm)}
                            </li>
                            {vaga.endereco && (
                                <li>
                                    <Icone nome="casa" className={styles.iconeDetalhe} />
                                    {vaga.endereco}
                                </li>
                            )}
                        </ul>

                        {vaga.ehMinha ? (
                            <div className={styles.acoes}>
                                {vaga.concluida && (
                                    <Link href={`/avaliar/${vaga.id}`} className={styles.botaoConcluir}>
                                        <Icone nome="estrela" className={styles.iconeBotao} />
                                        Avaliar serviço
                                    </Link>
                                )}

                                {!vaga.concluida && vaga.temProfissional && (
                                    <button
                                        type="button"
                                        className={styles.botaoConcluir}
                                        onClick={concluir}
                                        disabled={acao !== ''}
                                    >
                                        <Icone nome="check" className={styles.iconeBotao} />
                                        {acao === 'concluindo' ? 'Concluindo...' : 'Concluir serviço'}
                                    </button>
                                )}

                                {!vaga.concluida && !vaga.temProfissional && (
                                    <button
                                        type="button"
                                        className={styles.botaoExcluir}
                                        onClick={excluir}
                                        disabled={acao !== ''}
                                    >
                                        <Icone nome="lixeira" className={styles.iconeBotao} />
                                        {acao === 'excluindo' ? 'Excluindo...' : 'Excluir vaga'}
                                    </button>
                                )}

                                {erroAcao && <p className={styles.erroAcao}>{erroAcao}</p>}
                            </div>
                        ) : (
                            <div className={styles.acoes}>
                                <button
                                    type="button"
                                    className={styles.botaoCandidatar}
                                    onClick={() => alert('Candidatura em breve.')}
                                >
                                    <Icone nome="enviar" className={styles.iconeBotao} />
                                    Candidatar-se
                                </button>

                                <IniciarChatButton
                                    outroUsuarioId={vaga.autor.id}
                                    vagaId={vaga.id}
                                    className={styles.botaoChat}
                                >
                                    <Icone nome="chat" className={styles.iconeBotao} />
                                    Chat
                                </IniciarChatButton>
                            </div>
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