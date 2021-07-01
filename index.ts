import * as fs from 'fs';
import * as cheerio from 'cheerio';
import * as inquirer from 'inquirer';

const languages = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt'];
const inputDir = '../privacy-portal-user/src/i18n';

type SourceTargetMap = { [source: string]: { value: string, state: string } };

const getSourceTargets = ($: cheerio.CheerioAPI) => {
  const sourceTargetMap: SourceTargetMap = {};
  $('trans-unit').each(function () {
    const source = $(this).children('source').text().trim();
    if (!sourceTargetMap[source]) {
      const target = $(this).children('target');
      sourceTargetMap[source] = { value: target.text().trim(), state: target.attr('state') || '' };
    } else {
      console.log('potential optimization:', source, 'has duplicated values');
    }
  })
  return sourceTargetMap;
}
const main = async () => {
  let languageSourceTargetMap: { [language: string]: SourceTargetMap } = {};

  languages.forEach((language) => {
    const sourceFile = fs.readFileSync(`${inputDir}/messages.${language}.xlf`);
    let $ = cheerio.load(sourceFile, {
      xmlMode: true,
      decodeEntities: false
    });
    languageSourceTargetMap = { ...languageSourceTargetMap, [language]: getSourceTargets($) };
  })

  const prompt = await inquirer.prompt([{ type: 'confirm', name: 'extracted', message: 'Please extract the translations now and confirm.' }]);
  if (!prompt.extracted) {
    process.exit(0);
  }

  languages.forEach((language) => {
    const sourceFile = fs.readFileSync(`${inputDir}/messages.${language}.xlf`);
    let $ = cheerio.load(sourceFile, {
      xmlMode: true,
      decodeEntities: false
    });
    const newTranslations = $('target[state="new"]');
    newTranslations.each(function () {
      const target = $(this)
      const newTarget = target.text().trim();
      const origTarget = languageSourceTargetMap[language][newTarget];
      if (origTarget.state !== 'new') {
        console.log('changing', target.text(), 'to', languageSourceTargetMap[language][newTarget].value);
        target.text(origTarget.value)
        target.attr('state', 'translated');
      }
    })
    console.log('new count:', newTranslations.length);
    fs.writeFileSync(`${inputDir}/messages.${language}.xlf`, $.xml())
  })
}

main();