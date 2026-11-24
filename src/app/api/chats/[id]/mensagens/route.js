import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/app/lib/db';
import { usuarioLogado } from '@/app/lib/sessao';
import { ehUuid } from '@/app/lib/uuid';

export const dynamic = 'force-dynamic';

async function participaDoChat(chatId, usuarioId) {
  const [rows] = await db.execute(
    `SELECT 1
       FROM usuario_has_chat
      WHERE chat_id_chat = UUID_TO_BIN(?) AND usuario_id_usuario = UUID_TO_BIN(?)`,
    [chatId, usuarioId]
  );
  return rows.length > 0;
}

// GET /api/chat/:chatId/mensagens
// Devolve as últimas 200 mensagens e marca como lidas as que o outro enviou.
export async function GET(_request, { params }) {
  const { id: chatId } = await params;
  const meuId = (await usuarioLogado())?.toLowerCase() ?? null;

  if (!meuId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }
  if (!ehUuid(chatId)) {
    return NextResponse.json({ erro: 'Chat inválido.' }, { status: 400 });
  }

  try {
    if (!(await participaDoChat(chatId, meuId))) {
      return NextResponse.json({ erro: 'Sem acesso a esta conversa.' }, { status: 403 });
    }

    const [meta] = await db.execute(
      `SELECT u.nome AS outroNome, v.titulo AS vagaTitulo
         FROM chat c
         JOIN usuario_has_chat o
              ON o.chat_id_chat = c.id_chat
             AND o.usuario_id_usuario <> UUID_TO_BIN(?)
         JOIN usuario u ON u.id_usuario = o.usuario_id_usuario
         LEFT JOIN vaga v ON v.id_vaga = c.vaga_id
        WHERE c.id_chat = UUID_TO_BIN(?)
        LIMIT 1`,
      [meuId, chatId]
    );

    const [rows] = await db.execute(
      `SELECT BIN_TO_UUID(id_mensagem) AS id,
              BIN_TO_UUID(usuario_id_usuario) AS remetenteId,
              texto,
              criado_em AS criadoEm,
              lida
         FROM mensagem
        WHERE chat_id_chat = UUID_TO_BIN(?)
        ORDER BY criado_em DESC
        LIMIT 200`,
      [chatId]
    );

    // Tudo que o outro usuário mandou e eu estou vendo agora passa a ser "lida"
    await db.execute(
      `UPDATE mensagem
          SET lida = 1
        WHERE chat_id_chat = UUID_TO_BIN(?)
          AND usuario_id_usuario <> UUID_TO_BIN(?)
          AND lida = 0`,
      [chatId, meuId]
    );

    return NextResponse.json({
      meuId,
      outroNome: meta[0]?.outroNome ?? '',
      vagaTitulo: meta[0]?.vagaTitulo ?? null,
      mensagens: rows.reverse().map((m) => ({ ...m, lida: Boolean(m.lida) })),
    });
  } catch (erro) {
    console.error('Erro ao buscar mensagens:', erro);
    return NextResponse.json({ erro: 'Erro ao buscar mensagens.' }, { status: 500 });
  }
}

// POST /api/chat/:chatId/mensagens  { "texto": "..." }
export async function POST(request, { params }) {
  const { id: chatId } = await params;
  const meuId = (await usuarioLogado())?.toLowerCase() ?? null;

  if (!meuId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }
  if (!ehUuid(chatId)) {
    return NextResponse.json({ erro: 'Chat inválido.' }, { status: 400 });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });
  }

  const texto = String(corpo?.texto ?? '').trim();
  if (!texto || texto.length > 2000) {
    return NextResponse.json(
      { erro: 'A mensagem deve ter entre 1 e 2000 caracteres.' },
      { status: 400 }
    );
  }

  try {
    if (!(await participaDoChat(chatId, meuId))) {
      return NextResponse.json({ erro: 'Sem acesso a esta conversa.' }, { status: 403 });
    }

    const id = randomUUID();
    await db.execute(
      `INSERT INTO mensagem (id_mensagem, texto, criado_em, chat_id_chat, lida, usuario_id_usuario)
       VALUES (UUID_TO_BIN(?), ?, NOW(3), UUID_TO_BIN(?), 0, UUID_TO_BIN(?))`,
      [id, texto, chatId, meuId]
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (erro) {
    console.error('Erro ao enviar mensagem:', erro);
    return NextResponse.json({ erro: 'Erro ao enviar mensagem.' }, { status: 500 });
  }
}