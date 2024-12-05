class JaCrawler {
    static crawl() {
        const code = location.href.match(/\d+/)[0];
        if(Database.getTrackByIdentify(code)) {
            console.log('DUPLICATE CODE!!!');
            return;
        }
        
        const tagKeys = new Map([
            ['Student', 'School Girl'],
            ['Imouto', 'Younger Sister'],
            ['Oneesan', 'Elder Sister'],
            ['Breast Sex', 'Paizuri'],
            ['Trap', 'Crossdress'],
            ['Voluptuous/Plump', 'Chubby'],
            ['Real Elder Sister', 'Sister,Oneesan,Incest'],
            ['Mommie', 'Mother'],
            ['Jock/Athlete/Sports', 'Sport Girl']
        ]);
        const blockTags = ['licking'];
        const cvKeys = new Map([
            ['Momoka Yuzuki', 'MOMOKA'],
            ['Aruha Kotone', 'Kotone Akatsuki']
        ]);
        const ps = document.querySelectorAll('p');
        
        const japName = ps[1].textContent.trim();
        const engName = JaCrawler.filterEngName(document.querySelector('h1.page-title').textContent);
        const rjCode = ps[3].textContent.split(': ')[1];
        
        const cvs = ps[2].textContent.split(': ')[1].split(',').map(cv => {
            const rs = cv.trim();
            if(!rs)
                return null;
            const testRs = cvKeys.get(rs) || Database.getCategory(Database.categoryType.CV, rs.split(' ').reverse().join(' '))?.name;
            return testRs || rs;
        }).filter((cv, index, array) => {
            if(!cv) return false;
            return array.indexOf(cv) === index;
        }).sort().join(',');

        const tags = [...document.querySelectorAll('.post-meta.post-tags a')].map(ele => ele.textContent)
        .map(tag => {
            tag = tag.trim();
            tagKeys.forEach((value, key) => {
                if(tag.toLowerCase().includes(key.toLowerCase())) {
                    tag = value;
                }
            });
            return tag;
        }).map(tag => {
            let rs = null;
            if([...tagKeys.values()].includes(tag))
                return tag;
            const searchArr = [...Database.tagMap.keys()];
            for (let i=0; i<searchArr.length; i++) {
                if(tag.toLowerCase().includes(searchArr[i])) {
                    rs = Database.tagMap.get(searchArr[i]).name;
                    break;
                }
            }
            return rs;
        }).filter((tag, index, array) => {
            if(!tag) return false;
            if(blockTags.includes(tag.toLowerCase())) return false;
            return array.indexOf(tag) === index;
        }).sort().join(',');

        console.log({ code, rjCode, cvs, tags, engName, japName });
        JaCrawler.copy(`at(${code}, "${rjCode}", "${cvs}", "${tags}", "", "${engName}", "${japName}", t0i0a)`);
        window.leakResultOfJa = `at(${code}, "${rjCode}", "${cvs}", "${tags}", "", "${engName}", "${japName}", t0i0a);`;
    }
  
    static async copy(value, timeout = 100) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);

        await new Promise(resolve => {
            setTimeout(()=> {
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
              console.log('copied');
              resolve('copied');
            }, timeout)
        });
    }
  
    static filterEngName(input) {
        let alphabeticCount = input.replace(/[^a-zA-Z]/g, "").length;
        let percentageAlphabetic = (alphabeticCount / input.length) * 100;
        return percentageAlphabetic > 60 ? input : 'engName';
    }
}

JaCrawler.crawl();