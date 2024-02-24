const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port =  3008;

app.get('/assos/:login', async (req, res) => {
    const login = req.params.login;
    try {
        const browser = await puppeteer.launch({    
            executablePath: await puppeteer.executablePath(),
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        const url = `https://assos.utc.fr/assos/${login}`;
        await page.goto(url, { waitUntil: 'networkidle0' });

        await page.waitForSelector('a'); 
        await page.waitForSelector('div.my-3'); 
        await page.waitForSelector('small.text-muted');

        const content = await page.content();


        const links = await page.$$eval('a', links => links.map(link => link.textContent));
        const desc = await page.$$eval('div.my-3', divs => divs.map(div => div.textContent));
        const title = await page.$$eval('small.text-muted', smalls => smalls.map(small => small.textContent));
        const name = await page.$$eval('span.navbar-title', spans => spans.map(span => span.textContent));
        const img_src = await page.$$eval('img', imgs => imgs.map(img => img.getAttribute('src')));
        const pole_get = await page.$$eval('h1.title', h1s => h1s.map(h1 => h1.getAttribute('class')));
        const pole = pole_get[0].split(" ")[2].replace("color-","")

        const staticLinks = [" Portail des assos"," Se connecter"," Flux"," Services"," Associations"," Partenaires"," Ent UTC"," Webmail UTC"," Moodle"," Signaler un bug", "DESCRIPTION"," ARTICLES"," ÉVÈNEMENTS","\n", ""];
        let mail = null;
        mail = links.filter(l => l.includes('@'))
        if( mail !== null){
            mail = mail[0]
        }
        const linksResult = links.filter(l => l.includes('http'))
        
        await browser.close();

        res.json({
            login: login,
            name : name[0],
            pole : pole,
            title: title[0],
            mail: mail,
            links: linksResult,
            desc: desc[0],
            thumbnail: img_src[0],
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération des données : ${error}`);
        res.status(500).send('Erreur lors de la récupération des données : login incorrect');
    }
});

app.get('/assos', async (req, res) => {
    try{
        const browser = await puppeteer.launch({
            executablePath: await puppeteer.executablePath(),
            args: ['--no-sandbox', '--disable-setuid-sandbox']        
        }); 
        const page = await browser.newPage();
        const url = "https://assos.utc.fr/assos";
        await page.goto(url, { waitUntil: 'networkidle0' });
        await page.waitForSelector('a'); 
        await page.waitForSelector('div.thumbnail'); 
        await page.waitForSelector('div.card-line');
        await page.waitForSelector('div.asso-shortname');


        const content = await page.content();

            const thumbsGet = await page.$$eval('div.thumbnail', divs => divs.map(div => ({
                style : div.getAttribute('style')
            })));

            const names = await page.$$eval('div.asso-shortname', divs => divs.map(div => div.textContent));
            const typeGet = await page.$$eval('div.card-line', divs => divs.map(div => ({
                class: div.getAttribute("class")
            })));
            const loginsGet = await page.$$eval('a', as => as.map(a => ({
                text: a.textContent,
                href: a.getAttribute('href')
              })));
            const type = [];
            const thumbs = [];
            const logins = [];
            const counters = [0,  0,  0,  0,  0]; // bde, pte, pae, pvdc, psec

            for (const item of loginsGet) {
                const link = item.href; 
                if (link && link.includes("/assos/")) {
                    const cleanLink = link.replace("/assos/", "");
                    logins.push(cleanLink);
                }
            }

            for (const element of thumbsGet) {
                const dataThumb = element.style;
                const resultat = dataThumb.match(/"(.*?)"/);
                if (resultat) {
                    thumbs.push(resultat[0]);
                }
            }


            for (const item of typeGet) {
                const dataType = item.class;
                const result = dataType.split(" ")[1];
                if (result === "bg-bde") {
                    counters[0] +=  1;
                } else if (result === "bg-polete") {
                    counters[1] +=  1;
                } else if (result === "bg-poleae") {
                    counters[2] +=  1;
                } else if (result === "bg-polevdc") {
                    counters[3] +=  1;
                } else if (result === "bg-polesec") {
                    counters[4] +=  1;
                } else {
                    throw new Error(`Pole inconnu : ${result}`);
                }
                const cleanResult = result.replace("bg-", "");
                type.push(cleanResult);
            }

            if (names.length !== type.length || names.length !== thumbs.length || names.length !== logins.length) {
                throw new Error("Error lors de la récupération des informations");
            }

            const data = [];
            for (let i =  0; i < names.length; i++) {
                const dataAsso = { name: names[i], pole: type[i], thumbnail: thumbs[i], login: logins[i] };
                data.push(dataAsso);
            }

            res.json({
                total : names.length,
                nb_bde: counters[0],
                nb_polete : counters[1],
                nb_poleae: counters[2],
                nb_polevdc: counters[3],
                nb_polesec: counters[4],
                assos: data
            });

    } catch (error) {
        console.error(`Erreur lors de la récupération des données : ${error}`);
        res.status(500).send('Erreur lors de la récupération des données');
    }
});

app.listen(port, () => {
    console.log(`L'API est en écoute sur le port ${port}`);
});
