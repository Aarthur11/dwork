'use client'

import { useEffect, useState } from "react";
import styles from "@/app/Cadastro/cadastro.module.css";
import Image from "next/image";
import { useRouter } from 'next/navigation';

const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// "12345678" -> "12345-678"
function formatarCep(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export default function Cadastro() {

    const router = useRouter();

    const [nome, setNome] = useState('');
    const [sobrenome, setSobrenome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [data, setData] = useState('');

    // categorias (profissão) que o usuário pode escolher
    const [categorias, setCategorias] = useState([]);
    const [selecionadas, setSelecionadas] = useState([]);
    const [carregandoCategorias, setCarregandoCategorias] = useState(true);
    const [erroCategorias, setErroCategorias] = useState('');

    const [cep, setCep] = useState('');
    const [estado, setEstado] = useState('');
    const [cidade, setCidade] = useState('');
    const [bairro, setBairro] = useState('');
    const [rua, setRua] = useState('');
    const [numero, setNumero] = useState('');
    const [complemento, setComplemento] = useState('');
    const [buscandoCep, setBuscandoCep] = useState(false);

    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState('');
    const [carregando, setCarregando] = useState(false);

    // busca a lista de categorias no servidor ao abrir a página
    useEffect(() => {
        const controle = new AbortController();

        async function carregar() {
            try {
                const res = await fetch('/api/categorias', { signal: controle.signal });
                if (!res.ok) throw new Error('Falha ao carregar categorias');

                setCategorias(await res.json());
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Falha ao carregar categorias:', e);
                    setErroCategorias('Não foi possível carregar as categorias.');
                }
            } finally {
                if (!controle.signal.aborted) setCarregandoCategorias(false);
            }
        }

        carregar();
        return () => controle.abort();
    }, []);

    // marca ou desmarca uma categoria
    function alternarCategoria(id) {
        setSelecionadas((atual) =>
            atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
        );
        setErros((anterior) => ({ ...anterior, categorias: '' }));
    }

    function validar() {
        const novos = {};

        if (!nome.trim()) novos.nome = 'Informe seu nome.';
        if (!sobrenome.trim()) novos.sobrenome = 'Informe seu sobrenome.';

        if (!email.trim()) novos.email = 'Informe seu e-mail.';
        else if (!/^\S+@\S+\.\S+$/.test(email)) novos.email = 'E-mail inválido.';

        if (!senha) novos.senha = 'Informe uma senha.';
        else if (senha.length < 8 || !/[A-Z]/.test(senha) || !/[a-z]/.test(senha) || !/[0-9]/.test(senha) || !/[^A-Za-z0-9]/.test(senha)) {
            novos.senha = 'A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo (!@#$%...).';
        }

        if (!data) novos.data = 'Informe sua data de nascimento.';
        else if (new Date(data) > new Date()) novos.data = 'Data inválida.';

        // categoria obrigatória: pelo menos uma
        if (selecionadas.length === 0) novos.categorias = 'Escolha pelo menos uma categoria.';

        if (cep.replace(/\D/g, '').length !== 8) novos.cep = 'Informe um CEP válido.';
        if (!estado) novos.estado = 'Selecione o estado.';
        if (!cidade.trim()) novos.cidade = 'Informe a cidade.';
        if (!bairro.trim()) novos.bairro = 'Informe o bairro.';
        if (!rua.trim()) novos.rua = 'Informe a rua.';
        if (!numero.trim()) novos.numero = 'Informe o número (ou S/N).';

        return novos;
    }

    // com 8 dígitos, consulta o ViaCEP e preenche rua, bairro, cidade e estado
    async function buscarCep(valorCep) {
        const digitos = valorCep.replace(/\D/g, '');
        if (digitos.length !== 8) return;

        setBuscandoCep(true);
        setErros((anterior) => ({ ...anterior, cep: '' }));

        try {
            const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
            const dados = await res.json();

            if (dados.erro) {
                setErros((anterior) => ({ ...anterior, cep: 'CEP não encontrado.' }));
                return;
            }

            setRua(dados.logradouro || '');
            setBairro(dados.bairro || '');
            setCidade(dados.localidade || '');
            setEstado(dados.uf || '');
        } catch (e) {
            setErros((anterior) => ({
                ...anterior,
                cep: 'Não foi possível buscar o CEP. Preencha os campos manualmente.',
            }));
        } finally {
            setBuscandoCep(false);
        }
    }

    function aoDigitarCep(e) {
        const formatado = formatarCep(e.target.value);
        setCep(formatado);
        if (formatado.length === 9) buscarCep(formatado);
    }

    async function confirmacao(e) {
        e.preventDefault();
        setErroGeral('');

        const novos = validar();
        setErros(novos);
        if (Object.keys(novos).length > 0) return;

        setCarregando(true);
        try {
            const res = await fetch('/api/Cadastro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: `${nome.trim()} ${sobrenome.trim()}`,
                    email,
                    senha,
                    dataNascimento: data,
                    categorias: selecionadas,
                    cep,
                    estado,
                    cidade,
                    bairro,
                    rua,
                    numero,
                    complemento,
                }),
            });

            const dados = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (dados.erros) setErros(dados.erros);
                else setErroGeral(dados.erro || 'Não foi possível fazer o cadastro.');
                return;
            }
            router.push('/login');
        } catch (err) {
            setErroGeral('Erro de conexão com o servidor.');
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className={styles.container}>

            <main className={styles.card}>
                <Image className={styles.logo} src="/logo.png" alt="Logo" width={200} height={80} />
                <h1 className={styles.titulo}>Bem-vindo(a)!</h1>
                <p className={styles.subtitulo}>Crie sua conta para continuar.</p>

                <form className={styles.form} onSubmit={confirmacao} noValidate>

                    <div className={styles.nome}>
                        <label htmlFor="nome">Nome</label>
                        <input type="text" name="nome" id="nome" placeholder="Nome" className={styles.input} value={nome}
                            onChange={(e) => setNome(e.target.value)}
                        />
                        {erros.nome && <span className={styles.erroCampo}>{erros.nome}</span>}
                    </div>

                    <div className={styles.nome}>
                        <label htmlFor="sobrenome">Sobrenome</label>
                        <input type="text" name="sobrenome" id="sobrenome" placeholder="Sobrenome" className={styles.input} value={sobrenome}
                            onChange={(e) => setSobrenome(e.target.value)}
                        />
                        {erros.sobrenome && <span className={styles.erroCampo}>{erros.sobrenome}</span>}
                    </div>

                    <div className={styles.email}>
                        <label htmlFor="email">E-mail</label>
                        <input type="email" name="email" id="email" placeholder="exemplo@gmail.com" className={styles.input} value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {erros.email && <span className={styles.erroCampo}>{erros.email}</span>}
                    </div>

                    <div className={styles.senha}>
                        <label htmlFor="senha">Senha</label>
                        <input type="password" name="senha" id="senha" placeholder="Exemplo1@" className={styles.input} value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                        />
                        {erros.senha && <span className={styles.erroCampo}>{erros.senha}</span>}
                    </div>

                    <div className={styles.data}>
                        <label htmlFor="data">Data de nascimento</label>
                        <input type="date" name="data" id="data" className={styles.input} value={data}
                            onChange={(e) => setData(e.target.value)}
                        />
                        {(erros.data || erros.dataNascimento) && (
                            <span className={styles.erroCampo}>{erros.data || erros.dataNascimento}</span>
                        )}
                    </div>

                    <fieldset className={styles.grupo}>
                        <legend>Escolha uma ou mais categorias que combinam com o que você faz</legend>

                        {carregandoCategorias && <p className={styles.dica}>Carregando categorias...</p>}
                        {erroCategorias && <span className={styles.erroCampo}>{erroCategorias}</span>}

                        <div className={styles.chips}>
                            {categorias.map((categoria) => (
                                <label key={categoria.id} className={styles.chipLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.chipInput}
                                        checked={selecionadas.includes(categoria.id)}
                                        onChange={() => alternarCategoria(categoria.id)}
                                    />
                                    <span className={styles.chipTexto}>{categoria.nome}</span>
                                </label>
                            ))}
                        </div>

                        {erros.categorias && <span className={styles.erroCampo}>{erros.categorias}</span>}
                    </fieldset>

                    <p className={styles.tituloSecao}>Endereço</p>

                    <div className={styles.nome}>
                        <label htmlFor="cep">CEP</label>
                        <input type="text" name="cep" id="cep" inputMode="numeric" placeholder="00000-000" className={styles.input} value={cep}
                            onChange={aoDigitarCep}
                        />
                        {buscandoCep && <span className={styles.dica}>Buscando CEP...</span>}
                        {erros.cep && <span className={styles.erroCampo}>{erros.cep}</span>}
                    </div>

                    <div className={styles.linha}>
                        <div className={`${styles.nome} ${styles.campoEstado}`}>
                            <label htmlFor="estado">Estado</label>
                            <select name="estado" id="estado" className={styles.input} value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                            >
                                <option value="">UF</option>
                                {UFS.map((uf) => (
                                    <option key={uf} value={uf}>{uf}</option>
                                ))}
                            </select>
                            {erros.estado && <span className={styles.erroCampo}>{erros.estado}</span>}
                        </div>

                        <div className={styles.nome}>
                            <label htmlFor="cidade">Cidade</label>
                            <input type="text" name="cidade" id="cidade" className={styles.input} value={cidade}
                                onChange={(e) => setCidade(e.target.value)}
                            />
                            {erros.cidade && <span className={styles.erroCampo}>{erros.cidade}</span>}
                        </div>
                    </div>

                    <div className={styles.nome}>
                        <label htmlFor="bairro">Bairro</label>
                        <input type="text" name="bairro" id="bairro" className={styles.input} value={bairro}
                            onChange={(e) => setBairro(e.target.value)}
                        />
                        {erros.bairro && <span className={styles.erroCampo}>{erros.bairro}</span>}
                    </div>

                    <div className={styles.nome}>
                        <label htmlFor="rua">Rua</label>
                        <input type="text" name="rua" id="rua" className={styles.input} value={rua}
                            onChange={(e) => setRua(e.target.value)}
                        />
                        {erros.rua && <span className={styles.erroCampo}>{erros.rua}</span>}
                    </div>

                    <div className={styles.linha}>
                        <div className={`${styles.nome} ${styles.campoNumero}`}>
                            <label htmlFor="numero">Número</label>
                            <input type="text" name="numero" id="numero" placeholder="S/N" maxLength={10} className={styles.input} value={numero}
                                onChange={(e) => setNumero(e.target.value)}
                            />
                            {erros.numero && <span className={styles.erroCampo}>{erros.numero}</span>}
                        </div>

                        <div className={styles.nome}>
                            <label htmlFor="complemento">Complemento</label>
                            <input type="text" name="complemento" id="complemento" placeholder="Opcional" maxLength={75} className={styles.input} value={complemento}
                                onChange={(e) => setComplemento(e.target.value)}
                            />
                            {erros.complemento && <span className={styles.erroCampo}>{erros.complemento}</span>}
                        </div>
                    </div>

                    {erroGeral && <span className={styles.erroCampo}>{erroGeral}</span>}

                    <button type="submit" className={styles.buttonEntrar} disabled={carregando || buscandoCep}>
                        {carregando ? 'Criando...' : 'Criar conta'}
                    </button>

                </form>
            </main>
        </div>
    )
}