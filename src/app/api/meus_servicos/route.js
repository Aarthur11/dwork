import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { usuarioLogado } from "@/app/lib/sessao";

export async function GET() {
  const eu = await usuarioLogado();
  if (!eu) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  try {
    // papel = o que eu sou nessa vaga; outro = a outra pessoa
    const [rows] = await db.execute(
      `SELECT BIN_TO_UUID(v.id_vaga) AS id,
              v.titulo,
              v.status,
              CASE WHEN v.cliente_id = UUID_TO_BIN(?) THEN 'cliente' ELSE 'profissional' END AS papel,
              CASE WHEN v.cliente_id = UUID_TO_BIN(?) THEN up.nome ELSE uc.nome END AS outro
         FROM vaga v
         JOIN usuario uc ON uc.id_usuario = v.cliente_id
         LEFT JOIN usuario up ON up.id_usuario = v.profissional_id
        WHERE (v.cliente_id = UUID_TO_BIN(?) OR v.profissional_id = UUID_TO_BIN(?))
          AND v.status <> 'cancelada'
        ORDER BY v.criado_em DESC`,
      [eu, eu, eu, eu]
    );

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        concluido: r.status === "concluida",
        papel: r.papel,
        outro: r.outro,
      }))
    );
  } catch (e) {
    console.error("Erro ao listar serviços:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}