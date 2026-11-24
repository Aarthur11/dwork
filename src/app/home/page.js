'use client';

import styles from '@/app/home/home.module.css';
import Image from "next/image";
import { useState, useEffect } from 'react';
import { categoria } from '../dados/dados_categorias';
import Link from 'next/link';

import Card from "@/app/Componentes/Card";
import Menu from "@/app/Componentes/Menu";

export default function Home() {

    const [textoBusca, setTextoBusca] = useState("");
    const [perfis, setPerfis] = useState([]);
    const [vagas, setVagas] = useState([]);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        const termo = textoBusca.trim();

        if (!termo) {
            setPerfis([]);
            setVagas([]);
            setCarregando(false);
            return;
        }

        const timer = setTimeout(async () => {
            setCarregando(true);
            try {
                const q = encodeURIComponent(termo);
                const [resPerfis, resVagas] = await Promise.all([
                    fetch(`/api/Filtrar_perfis?busca=${q}`),
                    fetch(`/api/Filtrar_vagas?busca=${q}`),
                ]);

                const dadosPerfis = await resPerfis.json().catch(() => []);
                const dadosVagas = await resVagas.json().catch(() => []);

                setPerfis(resPerfis.ok && Array.isArray(dadosPerfis) ? dadosPerfis : []);
                setVagas(resVagas.ok && Array.isArray(dadosVagas) ? dadosVagas : []);
            } catch (err) {
                console.error("Erro na busca:", err);
                setPerfis([]);
                setVagas([]);
            } finally {
                setCarregando(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [textoBusca]);

    const mostrarResultados = textoBusca.trim().length > 0;
    const semResultados = perfis.length === 0 && vagas.length === 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href='/home'>
                    <Image className={styles.logo} src="/logo.png" alt="Logo" width={200} height={80} />
                </Link>
                <Link href="/meu_perfil">
                    <Image className={styles.place} src="/place.png" alt="place" width={20} height={20} />
                </Link>
            </header>

            <main className={styles.main}>
                <h1 className={styles.titulo}>Olá!</h1>
                <p className={styles.subtitulo}>Que serviço podemos facilitar hoje?</p>

                <div className={styles.frase}>
                    <Image className={styles.frase_motivacional} src="/frase_motivacional.png" alt="Frase" width={200} height={80} />
                    <p>Onde talentos encontram oportunidades!</p>
                </div>

                <div className={styles.busca}>
                    <div className={styles.container_topo}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg>
                        <input
                            className={styles.input}
                            type="text"
                            onChange={(event) => setTextoBusca(event.target.value)}
                            value={textoBusca}
                            placeholder="Busque por profissionais ou vagas"
                        />
                    </div>

                    {mostrarResultados && (
                        <div className={styles.resultados}>
                            {carregando && <p className={styles.aviso}>Buscando...</p>}
                            {!carregando && semResultados && (
                                <p className={styles.aviso}>Nenhum resultado encontrado.</p>
                            )}

                            {perfis.length > 0 && (
                                <>
                                    <p className={styles.resultadosTitulo}>Profissionais</p>
                                    {perfis.map((p) => (
                                        <Link key={p.id} href={`/visualizar_perfil/${p.id}`} className={styles.resultado}>
                                            <div className={styles.resultadoFoto}>
                                                {p.foto
                                                    ? <img src={p.foto} alt={p.nome} />
                                                    : <span>{p.nome.charAt(0).toUpperCase()}</span>}
                                            </div>
                                            <div className={styles.resultadoInfo}>
                                                <strong>{p.nome}</strong>
                                                <small>{p.especialidade}</small>
                                            </div>
                                        </Link>
                                    ))}
                                </>
                            )}

                            {vagas.length > 0 && (
                                <>
                                    <p className={styles.resultadosTitulo}>Vagas</p>
                                    {vagas.map((v) => (
                                        <Link key={v.id} href={`/visualizar_vaga/${v.id}`} className={styles.resultado}>
                                            <div className={`${styles.resultadoFoto} ${styles.resultadoFotoVaga}`}>
                                                <span>V</span>
                                            </div>
                                            <div className={styles.resultadoInfo}>
                                                <strong>{v.titulo}</strong>
                                                <small>
                                                    {[v.categoria, v.urgente ? 'Urgente' : null].filter(Boolean).join(' · ')}
                                                </small>
                                            </div>
                                        </Link>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <h4 className={styles.tituloCategorias}>Categorias</h4>
                <div className={styles.item_card}>
                    {categoria.map((item) => (
                        <Card key={item.id} categoria={item} />
                    ))}
                </div>

                <Link href='/criar_vaga' className={styles.criar_vaga}>
                    + Crie uma vaga
                </Link>
            </main>

            <footer>
                <Menu />
            </footer>
        </div>
    );
}