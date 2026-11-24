import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/app/lib/db";
import { criarSessao } from "@/app/lib/sessao";

export async function POST(req) {
  try {
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return NextResponse.json({ erro: "Preencha e-mail e senha." }, { status: 400 });
    }

    const [rows] = await db.execute(
      "SELECT BIN_TO_UUID(id_usuario) AS id, nome, senha FROM usuario WHERE email = ? LIMIT 1",
      [email]
    );

    const usuario = rows[0];
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      return NextResponse.json({ erro: "E-mail e/ou senha incorretos." }, { status: 401 });
    }

    await criarSessao(usuario.id); // grava o cookie "sessao" que o usuarioLogado() lê

    return NextResponse.json({ id: usuario.id, nome: usuario.nome });
  } catch (e) {
    console.error("Erro no login:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}