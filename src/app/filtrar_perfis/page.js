'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import styles from '@/app/filtrar_perfis/filtrar_perfis.module.css';
import Menu from '@/app/Componentes/Menu';

// tira acentos e maiúsculas para a busca achar "joao" em "João"
function normalizar(texto) {
    return (texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// "João Silva" -> "JS"
function iniciais(nome) {
    return nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0].toUpperCase())
        .join('');
}

const FILTROS = [
    { id: 'todos', texto: 'Todos', icone: null },
    { id: 'avaliacao', texto: 'Melhor avaliação', icone: 'estrela' },
    // precisa de usuário logado + endereço; fica desativado até lá
    { id: 'localizacao', texto: 'Localização', icone: 'relogio', desativado: true },
];

function Icone({ nome }) {
    const caminhos = {
        voltar: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
        busca: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
        estrela: 'm22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
        estrelaCheia: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        relogio: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
        baixo: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    };

    return (
        <svg
            className={styles.icone}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d={caminhos[nome]} />
        </svg>
    );
}

function ListaProfissionais() {
    const router = useRouter();
    const categoria = useSearchParams().get('categoria'); // vem do clique no card da home

    const [profissionais, setProfissionais] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    const [textoBusca, setTextoBusca] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [ordem, setOrdem] = useState('relevancia');

    // busca os usuários-profissionais no servidor (e de novo se a categoria mudar)
    useEffect(() => {
        const controle = new AbortController();

        async function carregar() {
            setCarregando(true);
            setErro('');
            try {
                const url = categoria
                    ? `/api/Filtrar_perfis?categoria=${encodeURIComponent(categoria)}`
                    : '/api/Filtrar_perfis';

                const res = await fetch(url, { signal: controle.signal });
                if (!res.ok) throw new Error('Falha ao carregar');

                const dados = await res.json();
                setProfissionais(Array.isArray(dados) ? dados : []);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Falha ao carregar profissionais:', e);
                    setErro('Não foi possível carregar os profissionais.');
                }
            } finally {
                if (!controle.signal.aborted) setCarregando(false);
            }
        }

        carregar();
        return () => controle.abort();
    }, [categoria]);

    const termo = normalizar(textoBusca.trim());

    let lista = profissionais.filter((p) => {
        if (filtro === 'avaliacao' && (p.nota ?? 0) < 4.8) return false;

        return (
            normalizar(p.nome).includes(termo) ||
            normalizar(p.especialidade).includes(termo)
        );
    });

    if (ordem === 'nota') lista = [...lista].sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0));
    if (ordem === 'servicos') lista = [...lista].sort((a, b) => b.servicos - a.servicos);

    return (
        <div className={styles.container}>

            <header className={styles.header}>
                <button
                    type="button"
                    className={styles.voltar}
                    onClick={() => router.back()}
                    aria-label="Voltar"
                >
                    <Icone nome="voltar" />
                </button>
                <h1 className={styles.titulo}>Encontrar profissionais</h1>
            </header>

            <main className={styles.main}>

                <div className={styles.busca}>
                    <input
                        className={styles.buscaInput}
                        type="text"
                        value={textoBusca}
                        onChange={(e) => setTextoBusca(e.target.value)}
                        placeholder="Busque por profissionais"
                        aria-label="Buscar profissionais"
                    />
                    <Icone nome="busca" />
                </div>

                <div className={styles.filtros}>
                    {FILTROS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            disabled={item.desativado}
                            title={item.desativado ? 'Em breve' : undefined}
                            className={`${styles.chip} ${filtro === item.id ? styles.chipAtivo : ''}`}
                            onClick={() => setFiltro(item.id)}
                        >
                            {item.icone && <Icone nome={item.icone} />}
                            {item.texto}
                        </button>
                    ))}
                </div>

                <div className={styles.topoLista}>
                    <h2 className={styles.subtitulo}>Profissionais recomendados</h2>

                    <label className={styles.ordenar}>
                        <span className={styles.somenteLeitor}>Ordenar por</span>
                        <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                            <option value="relevancia">Relevância</option>
                            <option value="nota">Maior nota</option>
                            <option value="servicos">Mais serviços</option>
                        </select>
                        <Icone nome="baixo" />
                    </label>
                </div>

                {carregando && <p className={styles.vazio}>Carregando...</p>}

                {!carregando && erro && <p className={styles.vazio}>{erro}</p>}

                {!carregando && !erro && lista.length === 0 && (
                    <p className={styles.vazio}>Nenhum profissional encontrado.</p>
                )}

                {!carregando && !erro && lista.length > 0 && (
                    <div className={styles.lista}>
                        {lista.map((p) => (
                            <Link
                                key={p.id}
                                href={`/visualizar_perfil/${p.id}`}
                                className={styles.perfil}
                            >
                                <span className={styles.avatar}>
                                    {p.foto ? (
                                        <img className={styles.avatarImg} src={p.foto} alt="" />
                                    ) : (
                                        iniciais(p.nome)
                                    )}
                                </span>

                                <span className={styles.info}>
                                    <span className={styles.nome}>{p.nome}</span>
                                    <span className={styles.especialidade}>{p.especialidade}</span>
                                    <span className={styles.meta}>
                                        {p.nota !== null ? (
                                            <>
                                                <span className={styles.estrela}>
                                                    <Icone nome="estrelaCheia" />
                                                </span>
                                                <strong>{p.nota.toFixed(1).replace('.', ',')}</strong>
                                            </>
                                        ) : (
                                            <strong>Novo</strong>
                                        )}
                                        <span className={styles.servicos}>
                                            {p.servicos} {p.servicos === 1 ? 'serviço' : 'serviços'}
                                        </span>
                                    </span>
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <footer>
                <Menu />
            </footer>
        </div>
    );
}

// useSearchParams precisa estar dentro de um Suspense para o build de produção não falhar
export default function FiltrarPerfis() {
    return (
        <Suspense fallback={null}>
            <ListaProfissionais />
        </Suspense>
    );
}