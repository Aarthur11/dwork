import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const NOME_COOKIE = "sessao";
const SETE_DIAS = 60 * 60 * 24 * 7;

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) throw new Error("Defina SESSION_SECRET no .env.local");
  return new TextEncoder().encode(segredo);
}

// chame no login, depois de conferir e-mail e senha
export async function criarSessao(usuarioId) {
  const token = await new SignJWT({ id: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(chave());

  const jar = await cookies();
  jar.set(NOME_COOKIE, token, {
    httpOnly: true,                                   // o JavaScript do navegador não lê o cookie
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SETE_DIAS,
  });
}

// devolve o id (uuid) do usuário logado, ou null se não houver sessão válida
export async function usuarioLogado() {
  const jar = await cookies();
  const token = jar.get(NOME_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, chave());
    return typeof payload.id === "string" ? payload.id : null;
  } catch {
    return null; // token adulterado ou expirado
  }
}

export async function encerrarSessao() {
  const jar = await cookies();
  jar.delete(NOME_COOKIE);
}