'use client';

import { useState } from 'react';
import Link from 'next/link';

import styles from '@/app/ajuda/ajuda.module.css';
import Menu from '@/app/Componentes/Menu';


const PERGUNTAS = [
    {
        id: 1,
        pergunta: 'Onde realizar o pagamento?',
        resposta: 'O cliente deve combinar diretamente com o profissional o valor do serviço , diante disso, o profissional deve clicar no botão definir valor para escolher preço e, o cliente confirma a contratação na aba que será gerada após a escolha do profissional.',
    },
    {
        id: 2,
        pergunta: 'Como avaliar um serviço?',
        resposta: 'Acesse a página Meus Serviços e clique na opção Concluído. Em seguida, será aberta a tela de avaliação, onde você poderá avaliar o profissional e compartilhar sua experiência.',
    },
    {
        id: 3,
        pergunta: 'Como contratar um serviço?',
        resposta: 'Pesquise e escolha um profissional que atenda às suas necessidades. Entre em contato com ele para combinar os detalhes do serviço. Caso o profissional aceite, ele deverá se candidatar à vaga pelo sistema. Depois, basta confirmar a candidatura para finalizar a contratação.',
    },
];

function Icone({ nome, className }) {
    const icones = {
        ajuda: {
            viewBox: '0 -960 960 960',
            d: 'M513.5-254.5Q528-269 528-290t-14.5-35.5Q499-340 478-340t-35.5 14.5Q428-311 428-290t14.5 35.5Q457-240 478-240t35.5-14.5ZM442-394h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z',
        },
        seta: {
            viewBox: '0 0 24 24',
            d: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
        },
        fone: {
            viewBox: '0 0 24 24',
            d: 'M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z',
        },
    };

    const { viewBox, d } = icones[nome];

    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={viewBox}
            fill="currentColor"
            aria-hidden="true"
        >
            <path d={d} />
        </svg>
    );
}

export default function Ajuda() {
    
    const [abertoId, setAbertoId] = useState(null);

    function alternar(id) {
        setAbertoId((atual) => (atual === id ? null : id));
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.titulo}>Central de ajuda</h1>
                <p className={styles.subtitulo}>Como podemos ajudar?</p>
            </header>

            <main className={styles.main}>

                <section className={styles.duvidas}>
                    <h2 className={styles.tituloDuvidas}>Dúvidas frequentes</h2>

                    <ul className={styles.lista}>
                        {PERGUNTAS.map((item) => {
                            const aberta = abertoId === item.id;

                            return (
                                <li key={item.id} className={styles.item}>
                                    <button
                                        type="button"
                                        className={styles.pergunta}
                                        onClick={() => alternar(item.id)}
                                        aria-expanded={aberta}
                                        aria-controls={`resposta-${item.id}`}
                                    >
                                        <span className={styles.iconeBox}>
                                            <Icone nome="ajuda" className={styles.iconeAjuda} />
                                        </span>
                                        <span className={styles.textoPergunta}>{item.pergunta}</span>
                                        <Icone
                                            nome="seta"
                                            className={`${styles.seta} ${aberta ? styles.setaAberta : ''}`}
                                        />
                                    </button>

                                    <div
                                        id={`resposta-${item.id}`}
                                        className={`${styles.resposta} ${aberta ? styles.respostaAberta : ''}`}
                                    >
                                        <p className={styles.textoResposta}>{item.resposta}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <Link href="/mapa_tutorial" className={styles.mapa}>
                    <span className={styles.mapaIcone}>
                        <Icone nome="fone" className={styles.iconeFone} />
                    </span>
                    <span className={styles.mapaTextos}>
                        <span className={styles.mapaTitulo}>Mapa tutorial</span>
                        <span className={styles.mapaSub}>Passo a passo para usar o app</span>
                    </span>
                    <Icone nome="seta" className={styles.mapaSeta} />
                </Link>

            </main>

            <footer>
                <Menu />
            </footer>
        </div>
    );
}