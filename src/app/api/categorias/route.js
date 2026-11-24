import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

// a lista vem sempre do banco, nunca guardada em cache
export const dynamic = "force-dynamic";

// GET /api/categorias -> [{ id, nome }]  (aberta: o cadastro usa antes de existir login)
export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT BIN_TO_UUID(idcategoria) AS id, nome
         FROM categoria
        ORDER BY nome`
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.error("Erro ao listar categorias:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}