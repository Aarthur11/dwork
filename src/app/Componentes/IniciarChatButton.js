'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Uso:
//   <IniciarChatButton outroUsuarioId={usuario.id} />                 // conversa direta
//   <IniciarChatButton outroUsuarioId={profissionalId} vagaId={vaga.id} /> // ligada a uma vaga
export default function IniciarChatButton({
  outroUsuarioId,
  vagaId = null,
  children = 'Conversar',
  className,
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function abrir() {
    setCarregando(true);
    setErro('');
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outroUsuarioId, vagaId }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro || 'Erro ao abrir conversa.');
      router.push(`/chat/${dados.chatId}`);
    } catch (e) {
      setErro(e.message);
      setCarregando(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={abrir} disabled={carregando}>
        {carregando ? 'Abrindo...' : children}
      </button>
      {erro && <p style={{ color: '#b91c1c', fontSize: 14 }}>{erro}</p>}
    </>
  );
}