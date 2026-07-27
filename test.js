const f = (txt) => {
  const r = /^\s*<html>(?:(?!<\/?html)[\s\S]*)<\/html>\s*$/; //не работает
  const r = /^\s*<html>(?:(?!<\/?html>)[\s\S])*<\/html>\s*$/; //работает
  return r.test(txt);
};