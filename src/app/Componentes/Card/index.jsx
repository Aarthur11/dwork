import Image from "next/image";
import styles from "@/app/Componentes/Card/Card.module.css";
import Link from "next/link";

export default function Card({ categoria }) {
    return (
        <div className={styles.container}>

            <Link
                href={`/filtrar_perfis?categoria=${encodeURIComponent(categoria.nome)}`}
                className={styles.link}
            >
                <span className={styles.iconeBox}>
                    <Image
                        className={styles.icone}
                        src={categoria.imagem}
                        alt=""
                        width={18}
                        height={18}
                    />
                </span>

                <span className={styles.nome}>{categoria.nome}</span>
            </Link>
        </div>
    );
}