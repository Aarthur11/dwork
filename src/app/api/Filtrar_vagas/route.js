import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

const STATUS_ABERTA = "aberta"; // o mesmo valor usado ao criar a vaga

export async function GET(req) {
  const busca = (new URL(req.url).searchParams.get("busca") ?? "").trim();
  if (!busca) return NextResponse.json([]);

  const termo = `%${busca}%`;

  try {
    const [rows] = await db.execute(
      `SELECT BIN_TO_UUID(v.id_vaga) AS id,
              v.titulo,
              v.urgente,
              c.nome AS categoria
         FROM vaga v
         LEFT JOIN categoria c ON c.idcategoria = v.categoria_idcategoria
        WHERE v.status = ?
          AND (v.titulo LIKE ? OR v.descricao LIKE ? OR c.nome LIKE ?)
        ORDER BY v.criado_em DESC
        LIMIT 10`,
      [STATUS_ABERTA, termo, termo, termo]
    );

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        urgente: Boolean(r.urgente),
        categoria: r.categoria,
      }))
    );
  } catch (e) {
    console.error("Erro ao buscar vagas:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}