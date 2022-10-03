import * as fs from 'fs';
import * as cheerio from 'cheerio';
import * as inquirer from 'inquirer';
import { Command } from 'commander';

const program = new Command('xliffmerge-no-whitespace');
program.version('1.0');
program.argument('<directory>', 'directory to migrate');

const options = program.parse();

const languages = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt'];
const inputDir = `${options.args[0]}/src/i18n`;

type SourceTargetMap = { [source: string]: { value: string, state: string } };
const cleanWhiteSpace = (input: string) => {
  return input.replace(/\s{2,}/g, ' ').trim();
}
const getSourceTargets = ($: cheerio.Root) => {
  const sourceTargetMap: SourceTargetMap = {};
  $('trans-unit').each(function () {
    const source = $(this).children('source');
    const sourceXml = cleanWhiteSpace(source.html());
    if (!sourceTargetMap[sourceXml]) {
      const target = $(this).children('target');
      const xml = cleanWhiteSpace(target.html());
      sourceTargetMap[sourceXml] = { value: xml, state: target.attr('state') || '' };
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
      const newTarget = cleanWhiteSpace(target.html());
      const origTarget = languageSourceTargetMap[language][newTarget];
      if(!origTarget) {
        console.log('no previous translation for message', newTarget)
      } else if (origTarget.state !== 'new') {
        console.log('changing', target.text(), 'to', languageSourceTargetMap[language][newTarget].value);
        target.html(origTarget.value)
        target.attr('state', 'translated');
      }
    })
    console.log('new count:', newTranslations.length);
    fs.writeFileSync(`${inputDir}/messages.${language}.xlf`, $.xml())
  })
}

main();