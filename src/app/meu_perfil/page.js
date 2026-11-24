'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from '@/app/meu_perfil/meu_perfil.module.css';
import Menu from '@/app/Componentes/Menu';
import Image from 'next/image';


function iniciais(nome) {
    return nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0].toUpperCase())
        .join('');
}


function formatarNota(nota) {
    return nota.toFixed(1).replace('.', ',');
}

function Icone({ nome, className }) {
    const caminhos = {
        engrenagem: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
        estrela: 'm22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
        servico: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
    };

    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d={caminhos[nome]} />
        </svg>
    );
}

export default function MeuPerfil() {
    const router = useRouter();

    const [perfil, setPerfil] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');


    useEffect(() => {
        const controle = new AbortController();

        async function carregar() {
            try {
                const res = await fetch('/api/meu_perfil', {
                    signal: controle.signal,
                    cache: 'no-store',
                });

                if (res.status === 401) {
                    router.push('/login');
                    return;
                }
                if (!res.ok) throw new Error('Falha ao carregar o perfil');

                setPerfil(await res.json());
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Falha ao carregar o perfil:', e);
                    setErro('Não foi possível carregar o perfil.');
                }
            } finally {
                if (!controle.signal.aborted) setCarregando(false);
            }
        }

        carregar();
        return () => controle.abort();
    }, [router]);

    return (
        <div className={styles.container}>

            <header className={styles.header}>
                <h1 className={styles.titulo}>Meu perfil</h1>
                <Link href="/editar_perfil" className={styles.engrenagem} aria-label="Editar perfil">
                    <Icone nome="engrenagem" className={styles.iconeEngrenagem} />
                </Link>
            </header>

            <main className={styles.main}>
                {carregando && <p className={styles.aviso}>Carregando...</p>}

                {!carregando && erro && <p className={styles.aviso}>{erro}</p>}

                {!carregando && !erro && perfil && (
                    <div className={styles.layout}>

                        {/* ===== Resumo: avatar, nome, nota e números ===== */}
                        <section className={styles.resumo}>
                            <div className={styles.avatar}>
                                {perfil.foto ? (
                                    <img className={styles.avatarImg} src={perfil.foto} alt="" />
                                ) : (
                                    iniciais(perfil.nome)
                                )}
                            </div>

                            <h2 className={styles.nome}>{perfil.nome}</h2>

                            <p className={styles.profissao}>
                                {perfil.categorias.length > 0
                                    ? perfil.categorias.join(' · ')
                                    : 'Sem categoria'}
                            </p>

                            <p className={styles.nota}>
                                {perfil.nota !== null ? (
                                    <>
                                        <Icone nome="estrela" className={styles.iconeEstrela} />
                                        <strong>{formatarNota(perfil.nota)}</strong>
                                        <span>({perfil.totalAvaliacoes})</span>
                                    </>
                                ) : (
                                    <span>Ainda sem avaliações</span>
                                )}
                            </p>

                        </section>


                        <div className={styles.conteudo}>

                            <section>
                                <h3 className={styles.secao}>Sobre mim</h3>
                                {perfil.descricao ? (
                                    <p className={styles.texto}>{perfil.descricao}</p>
                                ) : (
                                    <p className={styles.vazio}>
                                        Nada por aqui ainda.{' '}
                                    </p>
                                )}
                            </section>

                            <section>
                                <h3 className={styles.secao}>Categorias</h3>
                                {perfil.categorias.length > 0 ? (
                                    <ul className={styles.lista}>
                                        {perfil.categorias.map((categoria) => (
                                            <li key={categoria} className={styles.servico}>

                                                <span>{categoria}</span>
                                               
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={styles.vazio}>Nenhuma categoria escolhida.</p>
                                )}
                            </section>

                            <section>
                                <h3 className={styles.secao}>Avaliações recebidas</h3>
                                {perfil.avaliacoes.length > 0 ? (
                                    <ul className={styles.lista}>
                                        {perfil.avaliacoes.map((avaliacao, indice) => (
                                            <li key={indice} className={styles.avaliacao}>
                                                <div className={styles.avaliacaoTopo}>
                                                    <strong>{avaliacao.autor}</strong>
                                                    <span className={styles.avaliacaoNota}>
                                                        <Icone nome="estrela" className={styles.iconeEstrela} />
                                                        {formatarNota(avaliacao.estrelas)}
                                                    </span>
                                                </div>
                                                {avaliacao.texto && (
                                                    <p className={styles.avaliacaoTexto}>“{avaliacao.texto}”</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={styles.vazio}>Ainda não há avaliações.</p>
                                )}
                            </section>

                        </div>
                    </div>
                )}
            </main>

            <footer>
                <Menu />
            </footer>
        </div>
    );
}