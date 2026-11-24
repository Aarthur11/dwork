import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { usuarioLogado } from "@/app/lib/sessao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Marina Alves Souza" -> "Marina S."  (a avaliação não expõe o nome completo)
function abreviarNome(nome) {
  const partes = String(nome).trim().split(/\s+/);
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

// GET /api/perfil          -> perfil do usuário logado ("Meu perfil")
// GET /api/perfil?id=UUID  -> perfil público de outro usuário ("Visualizar perfil")
export async function GET(req) {
  const eu = await usuarioLogado();
  const idPedido = new URL(req.url).searchParams.get("id");

  let id;
  if (idPedido) {
    if (!UUID.test(idPedido)) {
      return NextResponse.json({ erro: "Perfil inválido." }, { status: 400 });
    }
    id = idPedido;
  } else {
    if (!eu) return NextResponse.json({ erro: "Faça login." }, { status: 401 });
    id = eu;
  }

  try {
    // as 5 consultas não dependem umas das outras, então rodam ao mesmo tempo
    const [
      [usuarios],
      [categorias],
      [estatisticas],
      [servicos],
      [avaliacoes],
    ] = await Promise.all([
      // 1. dados básicos + foto de perfil (nunca selecione e-mail nem senha aqui)
      db.execute(
        `SELECT BIN_TO_UUID(u.id_usuario) AS id,
                u.nome,
                u.descricao,
                (SELECT f.url
                   FROM foto f
                  WHERE f.usuario_id_usuario = u.id_usuario
                    AND f.tipo = 'perfil'
                  ORDER BY f.criado_em DESC
                  LIMIT 1) AS foto
           FROM usuario u
          WHERE u.id_usuario = UUID_TO_BIN(?)`,
        [id]
      ),
      // 2. categorias que o usuário escolheu
      db.execute(
        `SELECT c.nome
           FROM categoria_has_usuario chu
           JOIN categoria c ON c.idcategoria = chu.categoria_idcategoria
          WHERE chu.usuario_id_usuario = UUID_TO_BIN(?)
          ORDER BY c.nome`,
        [id]
      ),
      // 3. nota média, total de avaliações e quantas foram positivas (4 ou 5 estrelas)
      db.execute(
        `SELECT COUNT(*) AS total,
                ROUND(AVG(estrelas), 1) AS nota,
                COALESCE(SUM(estrelas >= 4), 0) AS positivas
           FROM avaliacao
          WHERE avaliado_id = UUID_TO_BIN(?)`,
        [id]
      ),
      // 4. serviços concluídos
      db.execute(
        `SELECT COUNT(*) AS total
           FROM vaga
          WHERE profissional_id = UUID_TO_BIN(?)
            AND status = 'concluida'`,
        [id]
      ),
      // 5. as 3 avaliações mais recentes, com o nome de quem avaliou
      db.execute(
        `SELECT a.estrelas, a.descricao AS texto, u.nome AS autor
           FROM avaliacao a
           JOIN usuario u ON u.id_usuario = a.avaliador_id
          WHERE a.avaliado_id = UUID_TO_BIN(?)
          ORDER BY a.criado_em DESC
          LIMIT 3`,
        [id]
      ),
    ]);

    if (usuarios.length === 0) {
      return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });
    }

    const u = usuarios[0];
    const total = Number(estatisticas[0].total);
    const positivas = Number(estatisticas[0].positivas);

        return NextResponse.json({
      ehMeu: eu !== null && eu.toLowerCase() === u.id.toLowerCase(),
      id: u.id,
      nome: u.nome,
      foto: u.foto,
      descricao: u.descricao,
      categorias: categorias.map((c) => c.nome),
      nota: total === 0 ? null : Number(estatisticas[0].nota),
      totalAvaliacoes: total,
      recomendam: total === 0 ? null : Math.round((positivas / total) * 100),
      servicos: Number(servicos[0].total),
      avaliacoes: avaliacoes.map((a) => ({
        autor: abreviarNome(a.autor),
        estrelas: Number(a.estrelas),
        texto: a.texto,
      })),
    });
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}