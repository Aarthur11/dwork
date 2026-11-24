import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { usuarioLogado } from '@/app/lib/sessao';
import { ehUuid } from '@/app/lib/uuid';

export const dynamic = 'force-dynamic';

const MAX_CATEGORIAS = 10;

// GET /api/perfil
// Devolve tudo que a tela precisa para abrir já preenchida:
// os dados do usuário, TODAS as categorias e quais ele já escolheu.
export async function GET() {
  const meuId = (await usuarioLogado())?.toLowerCase() ?? null;
  if (!meuId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const [usuarios] = await db.execute(
      `SELECT nome, email, descricao
         FROM usuario
        WHERE id_usuario = UUID_TO_BIN(?)`,
      [meuId]
    );
    if (usuarios.length === 0) {
      return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
    }

    const [categorias] = await db.execute(
      `SELECT BIN_TO_UUID(idcategoria) AS id, nome
         FROM categoria
        ORDER BY nome`
    );

    const [escolhidas] = await db.execute(
      `SELECT BIN_TO_UUID(categoria_idcategoria) AS id
         FROM categoria_has_usuario
        WHERE usuario_id_usuario = UUID_TO_BIN(?)`,
      [meuId]
    );

    return NextResponse.json({
      usuario: {
        nome: usuarios[0].nome,
        email: usuarios[0].email,
        descricao: usuarios[0].descricao ?? '',
      },
      categorias,
      selecionadas: escolhidas.map((c) => c.id),
    });
  } catch (erro) {
    console.error('Erro ao buscar perfil:', erro);
    return NextResponse.json({ erro: 'Erro ao buscar perfil.' }, { status: 500 });
  }
}

// PUT /api/perfil  { nome, descricao, categorias: ["<uuid>", ...] }
// Atualiza o usuário e troca as categorias dele, tudo numa transação
// (ou grava tudo, ou não grava nada).
export async function PUT(request) {
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

  // ---- validação: nunca confie no que vem do navegador ----
  const nome = String(corpo?.nome ?? '').trim();
  const descricao = String(corpo?.descricao ?? '').trim();
  const categorias = Array.isArray(corpo?.categorias)
    ? [...new Set(corpo.categorias.map((c) => String(c).toLowerCase()))]
    : [];

  if (nome.length < 2 || nome.length > 150) {
    return NextResponse.json(
      { erro: 'O nome deve ter entre 2 e 150 caracteres.' },
      { status: 400 }
    );
  }
  if (descricao.length > 220) {
    return NextResponse.json(
      { erro: 'O campo "Sobre você" aceita no máximo 220 caracteres.' },
      { status: 400 }
    );
  }
  if (categorias.length > MAX_CATEGORIAS || !categorias.every(ehUuid)) {
    return NextResponse.json(
      { erro: `Escolha até ${MAX_CATEGORIAS} categorias válidas.` },
      { status: 400 }
    );
  }

  let conexao;
  try {
    conexao = await db.getConnection();
    await conexao.beginTransaction();

    // 1) atualiza os dados do usuário (descrição vazia vira NULL)
    await conexao.execute(
      `UPDATE usuario
          SET nome = ?, descricao = ?
        WHERE id_usuario = UUID_TO_BIN(?)`,
      [nome, descricao || null, meuId]
    );

    // 2) apaga as categorias antigas...
    await conexao.execute(
      `DELETE FROM categoria_has_usuario WHERE usuario_id_usuario = UUID_TO_BIN(?)`,
      [meuId]
    );

    // 3) ...e grava as novas (mesmo padrão do seu cadastro)
    if (categorias.length > 0) {
      const linhas = categorias.map(() => '(UUID_TO_BIN(?), UUID_TO_BIN(?))').join(', ');
      const valores = categorias.flatMap((categoriaId) => [categoriaId, meuId]);

      await conexao.execute(
        `INSERT INTO categoria_has_usuario (categoria_idcategoria, usuario_id_usuario)
         VALUES ${linhas}`,
        valores
      );
    }

    await conexao.commit();
    return NextResponse.json({ ok: true });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    if (erro.code === 'ER_NO_REFERENCED_ROW_2') {
      return NextResponse.json({ erro: 'Categoria inexistente.' }, { status: 400 });
    }
    console.error('Erro ao salvar perfil:', erro);
    return NextResponse.json({ erro: 'Erro ao salvar perfil.' }, { status: 500 });
  } finally {
    if (conexao) conexao.release();
  }
}