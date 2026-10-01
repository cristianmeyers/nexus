const LANG = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MODULE_ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;

const text = (max = 255, pattern = null, def = "") => ({
  type: "string",
  max,
  pattern,
  default: def,
});
const bool = (def) => ({ type: "boolean", default: def });
const oneOf = (values, def) => ({ type: "enum", values, default: def });
const int = (min, max, def) => ({ type: "int", min, max, default: def });
const secret = () => ({ type: "secret", max: 512 });

const SECTIONS = {
  general: {
    fields: {
      versionChannel: oneOf(["stable", "beta", "nightly"], "stable"),
      autoCheckUpdate: bool(true),
      language: text(10, LANG, "fr"),
      debugLanguage: text(10, LANG, "fr"),
      autoUpdateLanguagePacks: bool(false),
    },
  },
  auth: {
    fields: {
      provider: oneOf(["local", "ldap", "oauth2"], "local"),
      ldapHost: text(255),
      ldapBaseDn: text(255),
      oauthClientId: text(255),
      oauthIssuerUrl: text(500),
    },
  },
  logs: {
    fields: {
      level: oneOf(["debug", "info", "warn", "error"], "info"),
      retentionDays: int(1, 3650, 30),
    },
  },
  mail: {
    fields: {
      host: text(255),
      port: int(1, 65535, 587),
      user: text(255),
      password: secret(),
      fromAddress: text(255, EMAIL),
      secure: bool(true),
    },
  },
  modules: { map: { keyPattern: MODULE_ID } },
};

function checkField(name, f, value) {
  switch (f.type) {
    case "boolean":
      return typeof value === "boolean"
        ? { value }
        : { error: `${name} doit être un booléen.` };
    case "enum":
      return f.values.includes(value)
        ? { value }
        : {
            error: `${name} doit être l'une des valeurs : ${f.values.join(", ")}.`,
          };
    case "int":
      return Number.isInteger(value) && value >= f.min && value <= f.max
        ? { value }
        : { error: `${name} doit être un entier entre ${f.min} et ${f.max}.` };
    case "string": {
      if (typeof value !== "string")
        return { error: `${name} doit être du texte.` };
      const v = value.trim();
      if (v.length > f.max)
        return { error: `${name} dépasse ${f.max} caractères.` };
      if (v !== "" && f.pattern && !f.pattern.test(v))
        return { error: `${name} a un format invalide.` };
      return { value: v };
    }
    case "secret":
      if (typeof value !== "string")
        return { error: `${name} doit être du texte.` };
      if (value === "") return { skip: true };
      if (value.length > f.max)
        return { error: `${name} dépasse ${f.max} caractères.` };
      return { value };
    default:
      return { error: `${name} : type non pris en charge.` };
  }
}

function validate(section, payload) {
  const def = SECTIONS[section];
  if (!def) return { errors: ["Section inconnue."] };
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { errors: ["Corps de requête invalide."] };
  }

  const data = {};
  const errors = [];

  for (const [key, value] of Object.entries(payload)) {
    if (def.map) {
      if (!def.map.keyPattern.test(key))
        errors.push(`Identifiant de module invalide : ${key}.`);
      else if (typeof value !== "boolean")
        errors.push(`${key} doit être un booléen.`);
      else data[key] = value;
      continue;
    }
    if (!Object.hasOwn(def.fields, key)) {
      errors.push(`Champ inconnu : ${key}.`);
      continue;
    }
    const res = checkField(key, def.fields[key], value);
    if (res.error) errors.push(res.error);
    else if (!res.skip) data[key] = res.value;
  }

  return errors.length ? { errors } : { data };
}

function toPublic(section, stored) {
  const def = SECTIONS[section];
  const source = stored && typeof stored === "object" ? stored : {};
  if (def.map) return { ...source };

  const out = {};
  for (const [key, f] of Object.entries(def.fields)) {
    if (f.type === "secret") {
      out[`${key}Set`] = typeof source[key] === "string" && source[key] !== "";
    } else {
      out[key] = Object.hasOwn(source, key) ? source[key] : f.default;
    }
  }
  return out;
}

module.exports = { SECTIONS, validate, toPublic };
