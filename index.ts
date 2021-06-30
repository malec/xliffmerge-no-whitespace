import * as fs from 'fs';
import * as cheerio from 'cheerio';
import * as inquirer from 'inquirer';

const languages = ['de', 'fr', 'it', 'ja', 'ko', 'pt'];
const inputDir = '../privacy-portal-user/src/i18n';

const getSourceTargets = ($: cheerio.CheerioAPI) => {
  const sourceTargetMap: { [source: string]: string } = {};
  $('trans-unit').each(function () {
    const source = $(this).children('source').text().trim();
    if (!sourceTargetMap[source]) {
      sourceTargetMap[source] = $(this).children('target').text().trim();
    } else {
      console.log('potential optimization:', source, 'has duplicated values');
    }
  })
  return sourceTargetMap;
}
const main = async () => {
  let sourceTargetMap: { [language: string]: { [source: string]: string} } = {};

  languages.forEach((language) => {
    const sourceFile = fs.readFileSync(`${inputDir}/messages.${language}.xlf`);
    let $ = cheerio.load(sourceFile, {
      xmlMode: true,
      decodeEntities: false
    });
    sourceTargetMap = { ...sourceTargetMap, [language]: getSourceTargets($) };
  })

  const prompt = await inquirer.prompt([{ type: 'confirm', name: 'extracted', message: 'Please extract the translations now and confirm. Complete?' }]);
  if(!prompt.extracted) {
    process.exit(0);
  }

  languages.forEach((language) => {
    const sourceFile = fs.readFileSync(`${inputDir}/messages.${language}.xlf`);
    let $ = cheerio.load(sourceFile, {
      xmlMode: true,
      decodeEntities: false
    });
    const newTranslations = $('target[state="new"]');
    newTranslations.each(function() {
      const target = $(this)
      const newTarget = target.text().trim();
      console.log('changing', target.text(), 'to', sourceTargetMap[language][newTarget]);
      target.text(sourceTargetMap[language][newTarget])
    })
    console.log('new count:', newTranslations.length);
    fs.writeFileSync(`${inputDir}/messages.${language}.xlf`, $.xml())
  })
}

main();