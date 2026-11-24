'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "@/app/visualizar_perfil/[id]/visualizar_perfil.module.css";
import Menu from "@/app/Componentes/Menu";
import IniciarChatButton from "@/app/Componentes/IniciarChatButton";

function iniciais(nome = "") {
    return nome.split(" ").filter(Boolean).slice(0, 2)
        .map((p) => p[0].toUpperCase()).join("");
}

export default function PerfilProfissional() {
    const { id } = useParams();
    const router = useRouter();
    const [perfil, setPerfil] = useState(null);
    const [erro, setErro] = useState("");

    useEffect(() => {
        async function carregar() {
            try {
                const res = await fetch(`/api/visualizar_perfil/${id}`);
                const dados = await res.json();
                if (!res.ok) {
                    setErro(dados.erro || "Erro ao carregar perfil.");
                    return;
                }
                setPerfil(dados);
            } catch (err) {
                console.error(err);
                setErro("Erro de conexão com servidor.");
            }
        }
        carregar();
    }, [id]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button type="button" className={styles.voltar} onClick={() => router.back()} aria-label="Voltar">
                    ‹
                </button>
                <h1 className={styles.tituloPagina}>Perfil profissional</h1>
            </header>

            {erro && <p className={styles.aviso}>{erro}</p>}
            {!perfil && !erro && <p className={styles.aviso}>Carregando...</p>}

            {perfil && (
                <main className={styles.main}>
                    <div className={styles.topo}>
                        <div className={styles.foto}>
                            {perfil.foto
                                ? <img src={perfil.foto} alt={perfil.nome} />
                                : <span>{iniciais(perfil.nome)}</span>}
                        </div>
                        <h2 className={styles.nome}>{perfil.nome}</h2>
                        <p className={styles.nota}>
                            {perfil.nota !== null
                                ? `⭐ ${perfil.nota} (${perfil.totalAvaliacoes})`
                                : "Sem avaliações"}
                        </p>
                    </div>

    

                    <h3 className={styles.secao}>Sobre mim</h3>
                    <p className={styles.sobre}>{perfil.sobre || "Este profissional ainda não escreveu uma descrição."}</p>

                    <h3 className={styles.secao}>Serviços oferecidos</h3>
                    <div className={styles.servicos}>
                        {perfil.categorias.length === 0 && <p className={styles.sobre}>Nenhum serviço cadastrado.</p>}
                        {perfil.categorias.map((nome) => (
                            <div key={nome} className={styles.servico}>{nome}</div>
                        ))}
                    </div>

                    {perfil.avaliacoes.length > 0 && (
                        <>
                            <h3 className={styles.secao}>Avaliações</h3>
                            {perfil.avaliacoes.map((a, i) => (
                                <div key={i} className={styles.avaliacao}>
                                    <div className={styles.avaliacaoTopo}>
                                        <strong>{a.autor}</strong>
                                        <span>⭐ {a.estrelas.toFixed(1)}</span>
                                    </div>
                                    {a.comentario && <p>“{a.comentario}”</p>}
                                </div>
                            ))}
                        </>
                    )}

                    {!perfil.ehMeu && (
                        <IniciarChatButton outroUsuarioId={perfil.id} className={styles.botaoChat}>
                            Chat
                        </IniciarChatButton>
                    )}
                </main>
            )}

            <footer>
                <Menu />
            </footer>
        </div>
    );
}