import * as fs from 'fs';
import * as cheerio from 'cheerio';

const languages = ['de', 'fr', 'it', 'ja', 'ko', 'pt'];
const inputDir = '../privacy-portal-user/src/i18n';

const getVarSelects = ($: cheerio.CheerioAPI) => {
  return $('target').filter(function () {
    return ($(this).text().trim() as string).startsWith('{VAR_SELECT, select,');
  });
}

const swapTargetSource = (varSelect: string) => {
  // {VAR_SELECT, select, Perfil AAdvantage {AAdvantage Profile} Registos de voo {Flight Records} Atividade AAdvantage {AAdvantage Activity} Admirals Club {Admirals Club} }
  const startingOffset = '{VAR_SELECT, select, ';
  let trimmedInput = varSelect.substring(startingOffset.length, varSelect.length - 3);
  // console.log('to \'' + trimmedInput +'\'');
  const map = trimmedInput.split('} ').map(x => x.split(' {'));
  console.log('split', map)
  let result = startingOffset.substring(0, startingOffset.length - 1);
  map.forEach(pair => {
    result = `${result} ${pair[1]} {${pair[0]}}`
  });
  result += ' }';
  console.log('result', result);
  return result;
}

languages.forEach((language) => {
  const sourceFile = fs.readFileSync(`${inputDir}/messages.${language}.xlf`);
  let $ = cheerio.load(sourceFile, {
    xmlMode: true,
    decodeEntities: false
  });
  let varSelects = getVarSelects($);
  varSelects.map(function(index, element) { $(this).text(swapTargetSource($(this).text())); console.log('')});
  fs.writeFileSync(`${inputDir}/messages.${language}.xlf`, $.xml())
})
