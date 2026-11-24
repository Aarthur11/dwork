'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from '@/app/meus_servicos/meus_servicos.module.css';
import Menu from '@/app/Componentes/Menu';

function Icone({ nome, className }) {
    const caminhos = {
        ferramenta: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
        seta: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
    };
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="currentColor" aria-hidden="true">
            <path d={caminhos[nome]} />
        </svg>
    );
}

export default function MeusServicos() {
    const router = useRouter();

    const [servicos, setServicos] = useState([]);
    const [papel, setPapel] = useState('cliente');
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        const controle = new AbortController();

        async function carregar() {
            try {
                const res = await fetch('/api/meus_servicos', {
                    signal: controle.signal,
                    cache: 'no-store',
                });

                if (res.status === 401) {
                    router.push('/login');
                    return;
                }
                if (!res.ok) throw new Error('Falha ao carregar');

                const dados = await res.json();
                setServicos(Array.isArray(dados) ? dados : []);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Falha ao carregar serviços:', e);
                    setErro('Não foi possível carregar os serviços.');
                }
            } finally {
                if (!controle.signal.aborted) setCarregando(false);
            }
        }

        carregar();
        return () => controle.abort();
    }, [router]);

    // só os serviços do papel escolhido
    const lista = servicos.filter((s) => s.papel === papel);
    const ativos = lista.filter((s) => !s.concluido).length;
    const concluidos = lista.filter((s) => s.concluido).length;

    return (
        <div className={styles.container}>

            <header className={styles.header}>
                <h1 className={styles.titulo}>Meus serviços</h1>
                <p className={styles.subtitulo}>Acompanhe cada etapa</p>
            </header>

            <main className={styles.main}>

                <div className={styles.abas} role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={papel === 'cliente'}
                        className={`${styles.aba} ${papel === 'cliente' ? styles.abaAtiva : ''}`}
                        onClick={() => setPapel('cliente')}
                    >
                        Como cliente
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={papel === 'profissional'}
                        className={`${styles.aba} ${papel === 'profissional' ? styles.abaAtiva : ''}`}
                        onClick={() => setPapel('profissional')}
                    >
                        Como profissional
                    </button>
                </div>

                <div className={styles.numeros}>
                    <div className={styles.numero}>
                        <strong className={styles.numeroAzul}>{ativos}</strong>
                        <span>ativos</span>
                    </div>
                    <div className={styles.numero}>
                        <strong className={styles.numeroVerde}>{concluidos}</strong>
                        <span>concluídos</span>
                    </div>
                </div>

                {carregando && <p className={styles.aviso}>Carregando...</p>}
                {!carregando && erro && <p className={styles.aviso}>{erro}</p>}

                {!carregando && !erro && lista.length === 0 && (
                    <p className={styles.aviso}>
                        {papel === 'cliente'
                            ? 'Você ainda não publicou nenhuma vaga.'
                            : 'Você ainda não foi escolhido para nenhum serviço.'}
                    </p>
                )}

                {!carregando && !erro && lista.length > 0 && (
                    <ul className={styles.lista}>
                        {lista.map((s) => {
                            const outro = s.outro ?? (papel === 'cliente' ? 'Aguardando profissional' : '');
                            return (
                                <li key={s.id}>
                                   <Link href={s.concluido ? `/avaliar/${s.id}` : `/visualizar_vaga/${s.id}`} className={styles.item}>
                                        <span className={styles.icone}>
                                            <Icone nome="ferramenta" className={styles.iconeSvg} />
                                        </span>
                                        <span className={styles.info}>
                                            <strong>{s.titulo}</strong>
                                            <span>{s.concluido ? `${outro} · Concluído` : outro}</span>
                                        </span>
                                        <Icone nome="seta" className={styles.seta} />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <Link href="/criar_vaga" className={styles.criar}>+ Crie uma vaga</Link>
            </main>

            <footer>
                <Menu />
            </footer>
        </div>
    );
}