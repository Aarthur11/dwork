import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/app/lib/db";
import { usuarioLogado } from "@/app/lib/sessao";

const STATUS_NOVA = "aberta"; // precisa existir no ENUM de vaga.status
const TIPO_FOTO = "vaga";     // precisa existir no ENUM de foto.tipo

const EXTENSOES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req) {
  const eu = await usuarioLogado();
  if (!eu) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  try {
    const form = await req.formData();

    const titulo = String(form.get("titulo") ?? "").trim();
    const descricao = String(form.get("descricao") ?? "").trim();
    const categoria = String(form.get("categoria") ?? "").trim();
    const urgente = form.get("urgente") === "true" ? 1 : 0;

    if (!titulo || !descricao || !categoria) {
      return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
    }

    const [cats] = await db.execute(
      "SELECT idcategoria FROM categoria WHERE nome = ? LIMIT 1",
      [categoria]
    );
    if (cats.length === 0) {
      return NextResponse.json({ erro: "Categoria inválida." }, { status: 400 });
    }

    const id = randomUUID();

    // criado_em = NOW(): a data da vaga é a do momento da criação
    await db.execute(
      `INSERT INTO vaga
         (id_vaga, titulo, descricao, cliente_id, categoria_idcategoria,
          urgente, status, criado_em)
       VALUES (UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), ?, ?, ?, NOW())`,
      [id, titulo, descricao, eu, cats[0].idcategoria, urgente, STATUS_NOVA]
    );

    // salva cada foto em public/uploads e guarda o endereço na tabela foto
    const pasta = path.join(process.cwd(), "public", "uploads");
    await mkdir(pasta, { recursive: true });

    const arquivos = form.getAll("fotos").filter((f) => typeof f !== "string" && f.size > 0);

    for (const arquivo of arquivos) {
      const extensao = EXTENSOES[arquivo.type];
      if (!extensao) continue; // ignora o que não for JPG, PNG ou WEBP

      const nome = `${randomUUID()}.${extensao}`;
      await writeFile(path.join(pasta, nome), Buffer.from(await arquivo.arrayBuffer()));

      await db.execute(
        `INSERT INTO foto (id_foto, url, tipo, criado_em, vaga_id, usuario_id_usuario)
         VALUES (UUID_TO_BIN(?), ?, ?, NOW(), UUID_TO_BIN(?), UUID_TO_BIN(?))`,
        [randomUUID(), `/uploads/${nome}`, TIPO_FOTO, id, eu]
      );
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Erro ao criar vaga:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}