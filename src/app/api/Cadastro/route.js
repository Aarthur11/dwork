import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/app/lib/db";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CATEGORIAS = 10;

// Data de hoje (YYYY-MM-DD) no fuso do Brasil, para não rejeitar "hoje" por causa do UTC
function hojeISO() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Bahia",
  });
}

// Confere formato e se a data realmente existe (ex.: rejeita 2026-02-31)
function dataValida(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !isNaN(d) && d.toISOString().slice(0, 10) === str;
}

export async function POST(req) {
  let corpo;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const nome = String(corpo.nome ?? "").trim();
  const email = String(corpo.email ?? "").trim().toLowerCase();
  const senha = String(corpo.senha ?? "");
  const dataNascimento = String(corpo.dataNascimento ?? "");

  const cepDigitos = String(corpo.cep ?? "").replace(/\D/g, "");
  const estado = String(corpo.estado ?? "").trim().toUpperCase();
  const cidade = String(corpo.cidade ?? "").trim();
  const bairro = String(corpo.bairro ?? "").trim();
  const rua = String(corpo.rua ?? "").trim();
  const numero = String(corpo.numero ?? "").trim();
  const complemento = String(corpo.complemento ?? "").trim();

  // categorias (profissão): lista de ids, sem repetição. Obrigatório: pelo menos uma.
  const categorias = Array.isArray(corpo.categorias)
    ? [...new Set(corpo.categorias.map(String))]
    : [];

  // ===== Validação (as mesmas regras do front) =====
  const erros = {};

  if (!nome) erros.nome = "Informe seu nome.";
  else if (nome.length > 150) erros.nome = "Nome muito longo.";

  if (!email) erros.email = "Informe seu e-mail.";
  else if (!/^\S+@\S+\.\S+$/.test(email)) erros.email = "E-mail inválido.";
  else if (email.length > 150) erros.email = "E-mail muito longo.";

  const senhaFraca =
    senha.length < 8 ||
    !/[A-Z]/.test(senha) ||
    !/[a-z]/.test(senha) ||
    !/[0-9]/.test(senha) ||
    !/[^A-Za-z0-9]/.test(senha);

  if (!senha) erros.senha = "Informe uma senha.";
  else if (Buffer.byteLength(senha, "utf8") > 72)
    erros.senha = "A senha deve ter no máximo 72 caracteres."; // limite do bcrypt (em bytes)
  else if (senhaFraca)
    erros.senha =
      "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.";

  if (!dataValida(dataNascimento)) {
    erros.dataNascimento = "Informe sua data de nascimento.";
  } else if (dataNascimento > hojeISO()) {
    erros.dataNascimento = "Data inválida.";
  }

  // ----- categorias (obrigatório: pelo menos uma) -----
  if (categorias.length === 0) {
    erros.categorias = "Escolha pelo menos uma categoria.";
  } else if (categorias.length > MAX_CATEGORIAS) {
    erros.categorias = `Escolha no máximo ${MAX_CATEGORIAS} categorias.`;
  } else if (!categorias.every((c) => UUID.test(c))) {
    erros.categorias = "Categoria inválida.";
  }

  // ----- endereço -----
  if (cepDigitos.length !== 8) erros.cep = "Informe um CEP válido.";
  if (!UFS.includes(estado)) erros.estado = "Selecione o estado.";

  if (!cidade) erros.cidade = "Informe a cidade.";
  else if (cidade.length > 100) erros.cidade = "Cidade muito longa.";

  if (!bairro) erros.bairro = "Informe o bairro.";
  else if (bairro.length > 100) erros.bairro = "Bairro muito longo.";

  if (!rua) erros.rua = "Informe a rua.";
  else if (rua.length > 150) erros.rua = "Rua muito longa.";

  if (!numero) erros.numero = "Informe o número (ou S/N).";
  else if (numero.length > 10) erros.numero = "Número muito longo.";

  if (complemento.length > 75) erros.complemento = "Complemento muito longo.";

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erros }, { status: 400 });
  }

  // a coluna cep é CHAR(9): guardamos no formato 12345-678
  const cep = `${cepDigitos.slice(0, 5)}-${cepDigitos.slice(5)}`;

  // ===== Gravação =====
  try {
    // todas as categorias enviadas precisam existir na tabela categoria
    const marcadores = categorias.map(() => "UUID_TO_BIN(?)").join(", ");
    const [existentes] = await db.execute(
      `SELECT COUNT(*) AS total FROM categoria WHERE idcategoria IN (${marcadores})`,
      categorias
    );

    if (Number(existentes[0].total) !== categorias.length) {
      return NextResponse.json(
        { erros: { categorias: "Categoria inválida." } },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(senha, 10);

    const enderecoId = randomUUID();
    const usuarioId = randomUUID();

    // endereço, usuário e categorias são gravados juntos:
    // se algo falhar, nada disso fica no banco
    const conexao = await db.getConnection();
    try {
      await conexao.beginTransaction();

      await conexao.execute(
        `INSERT INTO endereco (id_endereco, cep, estado, cidade, bairro, rua, numero, complemento)
         VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?)`,
        [enderecoId, cep, estado, cidade, bairro, rua, numero, complemento || null]
      );

      await conexao.execute(
        `INSERT INTO usuario (id_usuario, nome, email, senha, data_nascimento, endereco_id_endereco)
         VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, UUID_TO_BIN(?))`,
        [usuarioId, nome, email, hash, dataNascimento, enderecoId]
      );

      const linhas = categorias.map(() => "(UUID_TO_BIN(?), UUID_TO_BIN(?))").join(", ");
      const valores = categorias.flatMap((categoriaId) => [categoriaId, usuarioId]);

      await conexao.execute(
        `INSERT INTO categoria_has_usuario (categoria_idcategoria, usuario_id_usuario)
         VALUES ${linhas}`,
        valores
      );

      await conexao.commit();
    } catch (e) {
      await conexao.rollback();
      throw e;
    } finally {
      conexao.release();
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { erros: { email: "E-mail já cadastrado." } },
        { status: 409 }
      );
    }
    console.error("Erro no cadastro:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}