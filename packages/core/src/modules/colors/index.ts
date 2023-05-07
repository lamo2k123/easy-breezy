import styles, { ForegroundColor } from 'ansi-styles';

export class Colors {

    public paint = (value: string, color: keyof ForegroundColor) => {
        return styles.color[color].open + value + styles.color[color].close
    }

    public hex = (value: string, color: string) => {
        return styles.color.ansi(styles.hexToAnsi(color)) + value + styles.color.close;
    }

}

export default new Colors();
