import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { usuarioLogado } from "@/app/lib/sessao";

export async function GET(req, { params }) {
  const { id } = await params;
  const eu = await usuarioLogado();

  try {
    const [usuarios] = await db.execute(
      `SELECT
          BIN_TO_UUID(u.id_usuario) AS id,
          u.nome,
          u.descricao AS sobre,
          (SELECT f.url FROM foto f
            WHERE f.usuario_id_usuario = u.id_usuario AND f.tipo = 'perfil'
            ORDER BY f.criado_em DESC LIMIT 1) AS foto,
          (SELECT ROUND(AVG(a.estrelas), 1) FROM avaliacao a
            WHERE a.avaliado_id = u.id_usuario) AS nota,
          (SELECT COUNT(*) FROM avaliacao a
            WHERE a.avaliado_id = u.id_usuario) AS total_avaliacoes,
          (SELECT COUNT(*) FROM avaliacao a
            WHERE a.avaliado_id = u.id_usuario AND a.estrelas >= 4) AS positivas,
          (SELECT COUNT(*) FROM vaga v
            WHERE v.profissional_id = u.id_usuario AND v.status = 'concluida') AS servicos
         FROM usuario u
        WHERE u.id_usuario = UUID_TO_BIN(?)
        LIMIT 1`,
      [id]
    );

    const u = usuarios[0];
    if (!u) {
      return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });
    }

    const [categorias] = await db.execute(
      `SELECT c.nome
         FROM categoria_has_usuario chu
         JOIN categoria c ON c.idcategoria = chu.categoria_idcategoria
        WHERE chu.usuario_id_usuario = UUID_TO_BIN(?)
        ORDER BY c.nome`,
      [id]
    );

    const [avaliacoes] = await db.execute(
      `SELECT ua.nome AS autor, a.estrelas, a.descricao
         FROM avaliacao a
         JOIN usuario ua ON ua.id_usuario = a.avaliador_id
        WHERE a.avaliado_id = UUID_TO_BIN(?)
        ORDER BY a.estrelas DESC
        LIMIT 5`,
      [id]
    );

    const total = Number(u.total_avaliacoes);

    return NextResponse.json({
      id: u.id,
      ehMeu: eu !== null && eu.toLowerCase() === u.id.toLowerCase(),
      nome: u.nome,
      sobre: u.sobre,
      foto: u.foto,
      nota: u.nota === null ? null : Number(u.nota),
      totalAvaliacoes: total,
      recomendam: total ? Math.round((Number(u.positivas) / total) * 100) : null,
      servicos: Number(u.servicos),
      categorias: categorias.map((c) => c.nome),
      avaliacoes: avaliacoes.map((a) => ({
        autor: a.autor,
        estrelas: Number(a.estrelas),
        comentario: a.descricao,
      })),
    });
  } catch (e) {
    console.error("Erro ao buscar perfil:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}