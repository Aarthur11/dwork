'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './Conversa.module.css';

const INTERVALO_MS = 3000; // de quanto em quanto tempo busca mensagens novas

export default function ConversaPage() {
  const { chatId } = useParams();
  const [mensagens, setMensagens] = useState([]);
  const [meuId, setMeuId] = useState(null);
  const [outroNome, setOutroNome] = useState('');
  const [vagaTitulo, setVagaTitulo] = useState(null);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}/mensagens`, { cache: 'no-store' });
      if (!res.ok) {
        setErro(
          res.status === 403
            ? 'Você não tem acesso a esta conversa.'
            : 'Erro ao carregar mensagens.'
        );
        return;
      }
      const dados = await res.json();
      setErro('');
      setMeuId(dados.meuId);
      setOutroNome(dados.outroNome);
      setVagaTitulo(dados.vagaTitulo);
      setMensagens(dados.mensagens);
    } catch {
      setErro('Sem conexão com o servidor.');
    }
  }, [chatId]);

  // Polling: busca ao abrir e depois a cada 3s (pausa se a aba estiver escondida)
  useEffect(() => {
    carregar();
    const timer = setInterval(() => {
      if (!document.hidden) carregar();
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [carregar]);

  // Rola para a última mensagem quando chega mensagem nova
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  async function enviar(e) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo }),
      });
      if (!res.ok) throw new Error();
      setTexto('');
      await carregar();
    } catch {
      setErro('Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <header className={styles.cabecalho}>
        <Link href="/chat" className={styles.voltar}>
          ←
        </Link>
        <div>
          <strong>{outroNome || 'Conversa'}</strong>
          {vagaTitulo && <small>Vaga: {vagaTitulo}</small>}
        </div>
      </header>

      <div className={styles.lista}>
        {mensagens.map((m) => {
          const minha = m.remetenteId === meuId;
          return (
            <div
              key={m.id}
              className={`${styles.balao} ${minha ? styles.minha : styles.dele}`}
            >
              <p>{m.texto}</p>
              <span>
                {new Date(m.criadoEm).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {minha && (m.lida ? ' ✓✓' : ' ✓')}
              </span>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <form className={styles.form} onSubmit={enviar}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite sua mensagem..."
          maxLength={2000}
        />
        <button type="submit" disabled={enviando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </main>
  );
}