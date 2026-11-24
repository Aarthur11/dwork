import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/app/lib/db";
import { usuarioLogado } from "@/app/lib/sessao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_CONCLUIDA = "concluida";
const TIPO_FOTO = "avaliacao"; // precisa existir no ENUM de foto.tipo
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSOES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// confere vaga, participação, conclusão e avaliação repetida
// devolve { erro, status } ou { vaga, outroId, euSouCliente, jaAvaliou }
async function carregarContexto(eu, id) {
  if (!UUID.test(id)) return { erro: "Vaga inválida.", status: 400 };

  const [vagas] = await db.execute(
    `SELECT v.titulo,
            v.status,
            v.criado_em,
            BIN_TO_UUID(v.cliente_id) AS cliente_id,
            BIN_TO_UUID(v.profissional_id) AS profissional_id
       FROM vaga v
      WHERE v.id_vaga = UUID_TO_BIN(?)
      LIMIT 1`,
    [id]
  );

  const vaga = vagas[0];
  if (!vaga) return { erro: "Vaga não encontrada.", status: 404 };

  const meuId = eu.toLowerCase();
  const euSouCliente = vaga.cliente_id?.toLowerCase() === meuId;
  const euSouProfissional = vaga.profissional_id?.toLowerCase() === meuId;

  if (!euSouCliente && !euSouProfissional) {
    return { erro: "Você não participou deste serviço.", status: 403 };
  }
  if (vaga.status !== STATUS_CONCLUIDA) {
    return { erro: "Este serviço ainda não foi concluído.", status: 400 };
  }

  const outroId = euSouCliente ? vaga.profissional_id : vaga.cliente_id;
  if (!outroId) return { erro: "Este serviço não tem outra pessoa para avaliar.", status: 400 };

  const [jaRows] = await db.execute(
    `SELECT 1 FROM avaliacao
      WHERE vaga_id_vaga = UUID_TO_BIN(?) AND avaliador_id = UUID_TO_BIN(?)
      LIMIT 1`,
    [id, eu]
  );

  return { vaga, outroId, euSouCliente, jaAvaliou: jaRows.length > 0 };
}

export async function GET(req, { params }) {
  const eu = await usuarioLogado();
  if (!eu) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const { id } = await params;

  try {
    const ctx = await carregarContexto(eu, id);
    if (ctx.erro) return NextResponse.json({ erro: ctx.erro }, { status: ctx.status });

    const [pessoas] = await db.execute(
      `SELECT u.nome,
              (SELECT GROUP_CONCAT(c.nome ORDER BY c.nome SEPARATOR ' · ')
                 FROM categoria_has_usuario chu
                 JOIN categoria c ON c.idcategoria = chu.categoria_idcategoria
                WHERE chu.usuario_id_usuario = u.id_usuario) AS categorias
         FROM usuario u
        WHERE u.id_usuario = UUID_TO_BIN(?)`,
      [ctx.outroId]
    );

    const outro = pessoas[0];

    return NextResponse.json({
      id,
      titulo: ctx.vaga.titulo,
      data: ctx.vaga.criado_em,
      jaAvaliou: ctx.jaAvaliou,
      outro: {
        nome: outro?.nome ?? "Usuário",
        // se eu sou o cliente, a outra pessoa é o profissional (mostra as categorias)
        descricao: ctx.euSouCliente ? (outro?.categorias || "Profissional") : "Cliente",
      },
    });
  } catch (e) {
    console.error("Erro ao carregar avaliação:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const eu = await usuarioLogado();
  if (!eu) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const { id } = await params;
  let idAvaliacao = null;

  try {
    const ctx = await carregarContexto(eu, id);
    if (ctx.erro) return NextResponse.json({ erro: ctx.erro }, { status: ctx.status });
    if (ctx.jaAvaliou) {
      return NextResponse.json({ erro: "Você já avaliou este serviço." }, { status: 409 });
    }

    const form = await req.formData();
    const estrelas = Number(form.get("estrelas"));
    const descricao = String(form.get("descricao") ?? "").trim();
    const foto = form.get("foto");

    if (!Number.isInteger(estrelas) || estrelas < 1 || estrelas > 5) {
      return NextResponse.json({ erro: "Escolha de 1 a 5 estrelas." }, { status: 400 });
    }
    if (descricao.length > 220) {
      return NextResponse.json({ erro: "O comentário deve ter até 220 caracteres." }, { status: 400 });
    }

    const temFoto = foto && typeof foto !== "string" && foto.size > 0;
    if (temFoto) {
      if (!EXTENSOES[foto.type]) {
        return NextResponse.json({ erro: "Use uma foto JPG, PNG ou WEBP." }, { status: 400 });
      }
      if (foto.size > MAX_BYTES) {
        return NextResponse.json({ erro: "A foto deve ter até 5 MB." }, { status: 400 });
      }
    }

    idAvaliacao = randomUUID();

    await db.execute(
      `INSERT INTO avaliacao
         (id_avaliacao, estrelas, descricao, vaga_id_vaga, avaliador_id, avaliado_id, criado_em)
       VALUES (UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), NOW())`,
      [idAvaliacao, estrelas, descricao, id, eu, ctx.outroId]
    );

    if (temFoto) {
      const pasta = path.join(process.cwd(), "public", "uploads");
      await mkdir(pasta, { recursive: true });

      const nome = `${randomUUID()}.${EXTENSOES[foto.type]}`;
      await writeFile(path.join(pasta, nome), Buffer.from(await foto.arrayBuffer()));

      await db.execute(
        `INSERT INTO foto (id_foto, url, tipo, criado_em, vaga_id, avaliacao_id_avaliacao, usuario_id_usuario)
         VALUES (UUID_TO_BIN(?), ?, ?, NOW(), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?))`,
        [randomUUID(), `/uploads/${nome}`, TIPO_FOTO, id, idAvaliacao, eu]
      );
    }

    return NextResponse.json({ id: idAvaliacao }, { status: 201 });
  } catch (e) {
    console.error("Erro ao salvar avaliação:", e);

    // desfaz o que já tinha sido gravado
    if (idAvaliacao) {
      try {
        await db.execute("DELETE FROM foto WHERE avaliacao_id_avaliacao = UUID_TO_BIN(?)", [idAvaliacao]);
        await db.execute("DELETE FROM avaliacao WHERE id_avaliacao = UUID_TO_BIN(?)", [idAvaliacao]);
      } catch {}
    }

    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}