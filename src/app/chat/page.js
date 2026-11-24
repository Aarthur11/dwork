'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Chat.module.css';
import Menu from '../Componentes/Menu';

const INTERVALO_MS = 5000;

function formatarData(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia
    ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function ListaConversasPage() {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' });
      if (!res.ok) {
        setErro(
          res.status === 401
            ? 'Faça login para ver suas conversas.'
            : 'Erro ao carregar conversas.'
        );
        return;
      }
      const dados = await res.json();
      setErro('');
      setConversas(dados.conversas);
    } catch {
      setErro('Sem conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const timer = setInterval(() => {
      if (!document.hidden) carregar();
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [carregar]);

  return (
    <main className={styles.container}>
      <h1 className={styles.titulo}>Conversas</h1>

      {erro && <p className={styles.erro}>{erro}</p>}
      {carregando && <p className={styles.vazio}>Carregando...</p>}
      {!carregando && !erro && conversas.length === 0 && (
        <p className={styles.vazio}>Você ainda não tem conversas.</p>
      )}

      <ul className={styles.lista}>
        {conversas.map((c) => (
          <li key={c.id}>
            <Link href={`/chat/${c.id}`} className={styles.item}>
              <div className={styles.avatar}>{c.outroNome?.[0]?.toUpperCase() ?? '?'}</div>
              <div className={styles.info}>
                <div className={styles.linhaTopo}>
                  <strong>{c.outroNome}</strong>
                  <span>{formatarData(c.ultimaEm ?? c.criadoEm)}</span>
                </div>
                {c.vagaTitulo && <small className={styles.vaga}>Vaga: {c.vagaTitulo}</small>}
                <div className={styles.linhaBase}>
                  <p>{c.ultimaMensagem ?? 'Nenhuma mensagem ainda'}</p>
                  {c.naoLidas > 0 && <span className={styles.badge}>{c.naoLidas}</span>}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <footer>
        <Menu />
      </footer>
    </main>
  );
}