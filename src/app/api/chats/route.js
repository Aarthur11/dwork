import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/app/lib/db';
import { usuarioLogado } from '@/app/lib/sessao';
import { ehUuid } from '@/app/lib/uuid';

export const dynamic = 'force-dynamic';

// GET /api/chat -> lista as conversas do usuário logado
export async function GET() {
  const meuId = (await usuarioLogado())?.toLowerCase() ?? null;
  if (!meuId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const [rows] = await db.execute(
      `SELECT BIN_TO_UUID(c.id_chat) AS id,
              u.nome AS outroNome,
              v.titulo AS vagaTitulo,
              (SELECT m.texto FROM mensagem m
                WHERE m.chat_id_chat = c.id_chat
                ORDER BY m.criado_em DESC LIMIT 1) AS ultimaMensagem,
              (SELECT m.criado_em FROM mensagem m
                WHERE m.chat_id_chat = c.id_chat
                ORDER BY m.criado_em DESC LIMIT 1) AS ultimaEm,
              (SELECT COUNT(*) FROM mensagem m
                WHERE m.chat_id_chat = c.id_chat
                  AND m.lida = 0
                  AND m.usuario_id_usuario <> UUID_TO_BIN(?)) AS naoLidas,
              c.criado_em AS criadoEm
         FROM usuario_has_chat meu
         JOIN chat c ON c.id_chat = meu.chat_id_chat
         JOIN usuario_has_chat o
              ON o.chat_id_chat = c.id_chat
             AND o.usuario_id_usuario <> meu.usuario_id_usuario
         JOIN usuario u ON u.id_usuario = o.usuario_id_usuario
         LEFT JOIN vaga v ON v.id_vaga = c.vaga_id
        WHERE meu.usuario_id_usuario = UUID_TO_BIN(?)
        ORDER BY COALESCE((SELECT MAX(m.criado_em) FROM mensagem m WHERE m.chat_id_chat = c.id_chat), c.criado_em) DESC`,
      [meuId, meuId]
    );

    const conversas = rows.map((r) => ({
      ...r,
      naoLidas: Number(r.naoLidas),
    }));

    return NextResponse.json({ conversas });
  } catch (erro) {
    console.error('Erro ao listar conversas:', erro);
    return NextResponse.json({ erro: 'Erro ao listar conversas.' }, { status: 500 });
  }
}

// POST /api/chat  { "outroUsuarioId": "<uuid>", "vagaId": "<uuid> (opcional)" }
// Abre a conversa entre o usuário logado e outro usuário.
// Sem vagaId: conversa direta. Com vagaId: conversa ligada àquela vaga.
// Se já existir, devolve a existente.
export async function POST(request) {
  const meuId = (await usuarioLogado())?.toLowerCase() ?? null;
  if (!meuId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });
  }

  const outroId = String(corpo?.outroUsuarioId ?? '').toLowerCase();
  const vagaId = corpo?.vagaId ? String(corpo.vagaId).toLowerCase() : null;

  if (!ehUuid(outroId) || outroId === meuId) {
    return NextResponse.json({ erro: 'Usuário inválido.' }, { status: 400 });
  }
  if (vagaId && !ehUuid(vagaId)) {
    return NextResponse.json({ erro: 'Vaga inválida.' }, { status: 400 });
  }

  let conexao;
  try {
    // Já existe uma conversa entre os dois (para essa vaga, ou sem vaga)?
    const [existentes] = await db.execute(
      `SELECT BIN_TO_UUID(c.id_chat) AS id
         FROM chat c
         JOIN usuario_has_chat a
              ON a.chat_id_chat = c.id_chat AND a.usuario_id_usuario = UUID_TO_BIN(?)
         JOIN usuario_has_chat b
              ON b.chat_id_chat = c.id_chat AND b.usuario_id_usuario = UUID_TO_BIN(?)
        WHERE c.vaga_id <=> UUID_TO_BIN(?)
        LIMIT 1`,
      [meuId, outroId, vagaId]
    );

    if (existentes.length > 0) {
      return NextResponse.json({ chatId: existentes[0].id });
    }

    const novoId = randomUUID();
    conexao = await db.getConnection();
    await conexao.beginTransaction();

    await conexao.execute(
      `INSERT INTO chat (id_chat, criado_em, vaga_id)
       VALUES (UUID_TO_BIN(?), NOW(), UUID_TO_BIN(?))`,
      [novoId, vagaId]
    );
    await conexao.execute(
      `INSERT INTO usuario_has_chat (usuario_id_usuario, chat_id_chat)
       VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?)), (UUID_TO_BIN(?), UUID_TO_BIN(?))`,
      [meuId, novoId, outroId, novoId]
    );

    await conexao.commit();
    return NextResponse.json({ chatId: novoId }, { status: 201 });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    if (erro.code === 'ER_NO_REFERENCED_ROW_2') {
      return NextResponse.json(
        { erro: 'Usuário ou vaga não encontrado.' },
        { status: 404 }
      );
    }
    console.error('Erro ao abrir chat:', erro);
    return NextResponse.json({ erro: 'Erro ao abrir conversa.' }, { status: 500 });
  } finally {
    if (conexao) conexao.release();
  }
}