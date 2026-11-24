'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './editar.module.css';

const MAX_DESCRICAO = 220;

// "Marina Alves" -> "MA"
function iniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export default function EditarPerfilPage() {
  const router = useRouter();

  // ---- ESTADO: tudo que muda na tela fica aqui ----
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categorias, setCategorias] = useState([]); // todas as opções
  const [selecionadas, setSelecionadas] = useState([]); // ids marcados
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'erro', texto }

  // ---- 1) AO ABRIR A TELA: busca os dados e preenche o formulário ----
  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch('/api/editar_perfil', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error();

        const dados = await res.json();
        setNome(dados.usuario.nome);
        setEmail(dados.usuario.email);
        setDescricao(dados.usuario.descricao);
        setCategorias(dados.categorias);
        setSelecionadas(dados.selecionadas);
      } catch {
        setAviso({ tipo: 'erro', texto: 'Não foi possível carregar seu perfil.' });
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [router]);

  // ---- 2) MARCAR / DESMARCAR uma categoria ----
  function alternarCategoria(id) {
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((c) => c !== id) : [...atual, id]
    );
  }

  // ---- 3) SALVAR: manda os campos para a API ----
  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setAviso(null);

    try {
      const res = await fetch('/api/editar_perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, descricao, categorias: selecionadas }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro || 'Erro ao salvar.');

      setAviso({ tipo: 'ok', texto: 'Perfil atualizado com sucesso!' });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <main className={styles.tela}>Carregando...</main>;
  }

  function Icone({ nome }) {
    const caminhos = {
        voltar: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
        busca: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
        estrela: 'm22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
        estrelaCheia: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        relogio: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
        baixo: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    };

    return (
        <svg
            className={styles.icone}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d={caminhos[nome]} />
        </svg>
    );
}

  return (
    <main className={styles.tela}>
      {/* Cabeçalho */}
      <header className={styles.cabecalho}>
        <button
          type="button"
          className={styles.voltar}
          onClick={() => router.back()}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <h1>Editar perfil</h1>
      </header>

      <form onSubmit={salvar} className={styles.form}>
        {/* Avatar com as iniciais */}
        <div className={styles.avatarArea}>
          <div className={styles.avatar}>{iniciais(nome)}</div>
        </div>

        <h2 className={styles.secao}>Dados pessoais</h2>

        <label className={styles.rotulo} htmlFor="nome">
          Nome completo
        </label>
        <input
          id="nome"
          className={styles.campo}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={150}
          required
        />

        <label className={styles.rotulo} htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          className={`${styles.campo} ${styles.somenteLeitura}`}
          value={email}
          readOnly
        />

        {/* No lugar do telefone: as categorias */}
        <label className={styles.rotulo}>Categorias</label>
        <div className={styles.categorias}>
          {categorias.map((c) => {
            const ativa = selecionadas.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`${styles.chip} ${ativa ? styles.chipAtivo : ''}`}
                onClick={() => alternarCategoria(c.id)}
                aria-pressed={ativa}
              >
                {c.nome}
              </button>
            );
          })}
        </div>

        <label className={styles.rotulo} htmlFor="descricao">
          Sobre você
        </label>
        <textarea
          id="descricao"
          className={`${styles.campo} ${styles.areaTexto}`}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={MAX_DESCRICAO}
          rows={4}
        />
        <span className={styles.contador}>
          {descricao.length}/{MAX_DESCRICAO}
        </span>

        {aviso && (
          <p className={aviso.tipo === 'ok' ? styles.avisoOk : styles.avisoErro}>
            {aviso.texto}
          </p>
        )}

        <button type="submit" className={styles.salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </main>
  );
}