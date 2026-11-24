import { NextResponse } from "next/server";
import { db } from "@/app/lib/db"; // use o MESMO import do seu Login/route.js

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const categoria = (searchParams.get("categoria") ?? "").trim();
  const busca = (searchParams.get("busca") ?? "").trim();

  const params = [];
  let filtros = "";

  if (categoria) {
    filtros += `
      AND EXISTS (
        SELECT 1
          FROM categoria_has_usuario chu2
          JOIN categoria c2 ON c2.idcategoria = chu2.categoria_idcategoria
         WHERE chu2.usuario_id_usuario = u.id_usuario
           AND c2.nome = ?
      )`;
    params.push(categoria);
  }

  if (busca) {
    filtros += ` AND u.nome LIKE ?`;
    params.push(`%${busca}%`);
  }

  try {
    const [rows] = await db.execute(
      `SELECT
          BIN_TO_UUID(u.id_usuario) AS id,
          u.nome,
          (SELECT f.url
             FROM foto f
            WHERE f.usuario_id_usuario = u.id_usuario
              AND f.tipo = 'perfil'
            ORDER BY f.criado_em DESC
            LIMIT 1) AS foto,
          (SELECT GROUP_CONCAT(c.nome ORDER BY c.nome SEPARATOR ' · ')
             FROM categoria_has_usuario chu
             JOIN categoria c ON c.idcategoria = chu.categoria_idcategoria
            WHERE chu.usuario_id_usuario = u.id_usuario) AS especialidade,
          (SELECT ROUND(AVG(a.estrelas), 1)
             FROM avaliacao a
            WHERE a.avaliado_id = u.id_usuario) AS nota,
          (SELECT COUNT(*)
             FROM vaga v
            WHERE v.profissional_id = u.id_usuario
              AND v.status = 'concluida') AS servicos
         FROM usuario u
        WHERE EXISTS (
                SELECT 1 FROM categoria_has_usuario chu3
                 WHERE chu3.usuario_id_usuario = u.id_usuario
              )
        ${filtros}
        ORDER BY nota DESC, servicos DESC, u.nome ASC`,
      params
    );

    const lista = rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      foto: r.foto,
      especialidade: r.especialidade,
      nota: r.nota === null ? null : Number(r.nota),
      servicos: Number(r.servicos),
    }));

    return NextResponse.json(lista);
  } catch (e) {
    console.error("Erro ao listar profissionais:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}