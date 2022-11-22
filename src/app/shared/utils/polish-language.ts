export class PolishLanguage {
    public static plural(singularNominative, pluralNominative, pluralGenitive, value) {
		if (value === 1) {
			return singularNominative;
		} else if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) {
			return pluralNominative;
		} else {
			return pluralGenitive;
		}
	}
}