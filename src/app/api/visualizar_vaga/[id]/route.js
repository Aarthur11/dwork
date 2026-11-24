import { NextResponse } from "next/server";
import { rm } from "fs/promises";
import path from "path";
import { db } from "@/app/lib/db";
import { usuarioLogado } from "@/app/lib/sessao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_CONCLUIDA = "concluida";

// ---------- ver a vaga ----------
export async function GET(req, { params }) {
  const { id } = await params;

  if (!UUID.test(id)) {
    return NextResponse.json({ erro: "Vaga inválida." }, { status: 400 });
  }

  try {
    const eu = await usuarioLogado();

    const [vagas] = await db.execute(
      `SELECT BIN_TO_UUID(v.id_vaga) AS id,
              v.titulo,
              v.descricao,
              v.urgente,
              v.status,
              v.criado_em,
              (v.profissional_id IS NOT NULL) AS tem_profissional,
              c.nome AS categoria,
              CONCAT_WS(', ', e.rua, e.numero, e.bairro) AS endereco,
              BIN_TO_UUID(u.id_usuario) AS autor_id,
              u.nome AS autor_nome,
              (SELECT ROUND(AVG(a.estrelas), 1) FROM avaliacao a
                WHERE a.avaliado_id = u.id_usuario) AS autor_nota,
              (SELECT COUNT(*) FROM avaliacao a
                WHERE a.avaliado_id = u.id_usuario) AS autor_total
         FROM vaga v
         JOIN usuario u ON u.id_usuario = v.cliente_id
         LEFT JOIN endereco e ON e.id_endereco = u.endereco_id_endereco
         LEFT JOIN categoria c ON c.idcategoria = v.categoria_idcategoria
        WHERE v.id_vaga = UUID_TO_BIN(?)
        LIMIT 1`,
      [id]
    );

    const v = vagas[0];
    if (!v) {
      return NextResponse.json({ erro: "Vaga não encontrada." }, { status: 404 });
    }

    const [fotos] = await db.execute(
      `SELECT url FROM foto
        WHERE vaga_id = UUID_TO_BIN(?) AND tipo = 'vaga'
        ORDER BY criado_em`,
      [id]
    );

    const total = Number(v.autor_total);

    return NextResponse.json({
      id: v.id,
      titulo: v.titulo,
      descricao: v.descricao,
      urgente: Boolean(v.urgente),
      categoria: v.categoria,
      endereco: v.endereco,
      fotos: fotos.map((f) => f.url),
      criadoEm: v.criado_em,
      concluida: v.status === STATUS_CONCLUIDA,
      temProfissional: Boolean(v.tem_profissional),
      // true quando quem está logado é quem publicou a vaga
      ehMinha: eu !== null && eu.toLowerCase() === v.autor_id.toLowerCase(),
      autor: {
        id: v.autor_id,
        nome: v.autor_nome,
        nota: total === 0 ? null : Number(v.autor_nota),
        totalAvaliacoes: total,
      },
    });
  } catch (e) {
    console.error("Erro ao carregar vaga:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}

// confere login e se a vaga é de quem está logado
// devolve { erro, status } ou { vaga }
async function verificarDono(id) {
  if (!UUID.test(id)) return { erro: "Vaga inválida.", status: 400 };

  const eu = await usuarioLogado();
  if (!eu) return { erro: "Faça login.", status: 401 };

  const [rows] = await db.execute(
    `SELECT v.status,
            BIN_TO_UUID(v.cliente_id) AS cliente_id,
            (v.profissional_id IS NOT NULL) AS tem_profissional
       FROM vaga v
      WHERE v.id_vaga = UUID_TO_BIN(?)
      LIMIT 1`,
    [id]
  );

  const vaga = rows[0];
  if (!vaga) return { erro: "Vaga não encontrada.", status: 404 };

  if (vaga.cliente_id?.toLowerCase() !== eu.toLowerCase()) {
    return { erro: "Só quem publicou a vaga pode fazer isso.", status: 403 };
  }

  return { vaga };
}

// ---------- concluir o serviço ----------
export async function PATCH(req, { params }) {
  const { id } = await params;

  try {
    const r = await verificarDono(id);
    if (r.erro) return NextResponse.json({ erro: r.erro }, { status: r.status });

    if (!r.vaga.tem_profissional) {
      return NextResponse.json({ erro: "Esta vaga ainda não tem profissional." }, { status: 400 });
    }
    if (r.vaga.status === STATUS_CONCLUIDA) {
      return NextResponse.json({ erro: "Este serviço já foi concluído." }, { status: 409 });
    }

    await db.execute(
      "UPDATE vaga SET status = ? WHERE id_vaga = UUID_TO_BIN(?)",
      [STATUS_CONCLUIDA, id]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao concluir vaga:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}

// ---------- excluir a vaga ----------
export async function DELETE(req, { params }) {
  const { id } = await params;

  try {
    const r = await verificarDono(id);
    if (r.erro) return NextResponse.json({ erro: r.erro }, { status: r.status });

    if (r.vaga.tem_profissional) {
      return NextResponse.json(
        { erro: "Não dá para excluir uma vaga que já tem profissional." },
        { status: 409 }
      );
    }

    const [fotos] = await db.execute(
      "SELECT url FROM foto WHERE vaga_id = UUID_TO_BIN(?)",
      [id]
    );

    await db.execute("DELETE FROM foto WHERE vaga_id = UUID_TO_BIN(?)", [id]);
    await db.execute("DELETE FROM vaga WHERE id_vaga = UUID_TO_BIN(?)", [id]);

    // apaga os arquivos das fotos (se falhar, não atrapalha)
    for (const f of fotos) {
      if (f.url?.startsWith("/uploads/")) {
        await rm(path.join(process.cwd(), "public", "uploads", path.basename(f.url)), { force: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao excluir vaga:", e);

    // 1451 = ainda existe algo ligado à vaga (por exemplo um chat)
    if (e.errno === 1451) {
      return NextResponse.json(
        { erro: "Esta vaga está ligada a outros registros (como conversas) e não pode ser excluída." },
        { status: 409 }
      );
    }
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}