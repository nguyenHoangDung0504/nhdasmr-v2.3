'use strict';

console.time('Build Database Time');
class Database {
    static config = {
        log: true,
        test: true,
        clearLog: false,
    };
    static categoryType = {
        CV: 0,
        TAG: 1,
        SERIES: 2,
    };
    static trackKeyMap = new Map();
    static trackMap = new Map();
    static cvMap = new Map();
    static tagMap = new Map();
    static seriesMap = new Map();
    static keyList = [];

    static addTrackToDatabase(code, rjCode, cvs, tags, series, engName, japName, thumbnail, images, audios, otherLinks = undefined) {
        if(!cvs) return;
        [cvs, tags, series, images, audios] = [cvs, tags, series, images, audios].map(member => {
            if(member !== undefined)
                return Utils.standardizedTrackArrData(member);
            return '';
        });
        [cvs, tags, series] = [cvs, tags, series].map(member => member.sort());

        otherLinks = otherLinks?.split(',').filter(subStr => subStr).map(noteNLink => {
            noteNLink = noteNLink.trim();
            const [note, link] = noteNLink.split('::').map(item => item.trim());
            return new OtherLink(note, link);
        });
      
        if(!rjCode.includes('RJ'))
            rjCode = 'Unknown_' + Array(6 - rjCode.length).fill('0').join('') + rjCode;

        const track = new Track(code, rjCode, cvs, tags, series, engName, japName, thumbnail, images, audios, otherLinks);
        if (!track.images.includes(track.thumbnail)) 
            track.images.unshift(track.thumbnail);
        Database.trackKeyMap.set(rjCode, code);
        Database.trackMap.set(code, track);

        const mapList = [Database.cvMap, Database.tagMap, Database.seriesMap];
        const classToCreate = [Cv, Tag, Series];
        
        [cvs, tags, series].forEach((member, i) => {
            member.forEach(item => {
                const key = item.toLowerCase();
                if(mapList[i].has(key)) {
                    mapList[i].get(key).quantity++;
                    return;
                }
                mapList[i].set(key, new classToCreate[i](item, 1));
            });
        });
    }

    // Get sorted key list functions
    static getSortedTracksKeyByRjCode(desc) {
        const keyList = [...Database.trackKeyMap.keys()].sort((a, b) => {
            const [nA, nB] = [a, b].map(rjCode => rjCode.replace('RJ', ''));
            return nA.length - nB.length || Number(nA) - Number(nB);
        }).map(rjCodeKey => Database.trackKeyMap.get(rjCodeKey));

        return desc ? keyList.reverse() : keyList;
    }
    static getSortedTracksKeyByCode(desc) {
        const keyList = [...Database.trackMap.keys()].sort((a, b) => a - b);
        return desc ? keyList.reverse() : keyList;
    }
    static getSortedTracksKeyByUploadOrder(desc) {
        const keyList = [...Database.trackMap.keys()];
        return desc ? keyList.reverse() : keyList;
    }

    // Sort tracks functions
    static sortByRjCode(desc = false) {
        Database.keyList = Database.getSortedTracksKeyByRjCode(desc);
    }
    static sortByCode(desc = false) {
        Database.keyList = Database.getSortedTracksKeyByCode(desc);
    }
    static sortByUploadOrder(desc = false) {
        Database.keyList = Database.getSortedTracksKeyByUploadOrder(desc);
    }

    // Get/search category functions
    static getCategory(type, keyword) {
        const { CV, TAG, SERIES } = Database.categoryType;
        let map = null;

        switch (type) {
            case CV: map = Database.cvMap; break;
            case TAG: map = Database.tagMap; break;
            case SERIES: map = Database.seriesMap; break;
            default: throw new Error('Invalid category type');
        }

        return map.get(keyword.toLowerCase());
    }
    static searchCategory(type, keyword) {
        const { CV, TAG, SERIES } = Database.categoryType;
        const lowerCaseKeyword = keyword.toLowerCase();
        const result = [];
        let map = null;

        switch (type) {
            case CV: map = Database.cvMap; break;
            case TAG: map = Database.tagMap; break;
            case SERIES: map = Database.seriesMap; break;
            default: throw new Error('Invalid category type');
        }

        map.forEach((value, key) => {
            if(key.includes(lowerCaseKeyword))
                result.push(value);
        });

        return result;
    }

    // Get/Search tracks key functions
    static searchTracksKey(keyword, keyListToSearch = Database.keyList) {
        const lowerCaseKeyword = keyword.toString().toLowerCase();
        const keyList = [];

        // Find Tracks with code, name or rjCode containing keywords
        keyListToSearch.forEach(codeKey => {
            let { code, rjCode, engName, japName, cvs, tags, series } = Database.trackMap.get(codeKey);

            // Standardized data
            code = code.toString();
            [rjCode, engName, japName] = [rjCode, engName, japName].map(str => str.toLowerCase());

            // Find Tracks with code, names or rjCode containing keywords
            if ([code, rjCode, engName, japName].some(valueToCheck => valueToCheck.includes(lowerCaseKeyword)))
                keyList.push(codeKey);

            // Find Tracks with CVs, tag or series contain keywords
            [cvs, tags, series].forEach(list => {
                list.forEach(item => {
                    if(!item.toLowerCase().includes(lowerCaseKeyword) || keyList.includes(codeKey)) return;
                    keyList.push(codeKey);
                });
            });
        });

        return keyList;
    }
    static getTracksKeyByCategory(type, keyword, keyListToSearch = Database.keyList) {
        const lowerCaseKeyword = keyword.toLowerCase();
        const keyList = [];
        const category = ['cvs', 'tags', 'series'][type];

        if(!category)
            throw new Error('Invalid category type');

        keyListToSearch.forEach(codeKey => {
            const track = Database.trackMap.get(codeKey);
            if(track[category].some(t => t.toLowerCase() === lowerCaseKeyword))
                keyList.push(codeKey);
        });

        return keyList;
    }
    static getTracksKeyForPage(page, trackPerPage = Config.trackPerPage, listToGet = Database.keyList) {
        const start = (page - 1) * trackPerPage;
        const end = Math.min(start + trackPerPage - 1, listToGet.length);

        return listToGet.slice(start, end + 1);
    }
    static getRandomTracksKey(n, keyList = Database.keyList) {
        let shuffledIndexes = JSON.parse(localStorage.getItem('shuffledIndexes'));
        const randomKeyList = [];

        if (!shuffledIndexes || shuffledIndexes.length < n) {
            const remainingIndexes = Array.from(
                Array(!shuffledIndexes ? keyList.length : keyList.length - shuffledIndexes.length).keys()
            );
            Utils.shuffleArray(remainingIndexes);
            if (!shuffledIndexes) {
                shuffledIndexes = remainingIndexes;
            } else {
                shuffledIndexes.push(...remainingIndexes);
            }
            localStorage.setItem('shuffledIndexes', JSON.stringify(shuffledIndexes));
        }

        for (let i = 0; i < n; i++) {
            randomKeyList.push(keyList[shuffledIndexes[i]]);
        }

        shuffledIndexes = shuffledIndexes.slice(n);
        localStorage.setItem('shuffledIndexes', JSON.stringify(shuffledIndexes));

        return randomKeyList;
    }

    // Get data functions
    static getSearchSuggestions(keyword) {
        const lowerCaseKeyword = keyword.toString().toLowerCase();
        const results = [];
        const seen = new Set();

        Database.keyList.forEach(keyCode => {
            const track = Database.trackMap.get(keyCode);
            const lowerCaseCode = track.code.toString();
            const lowerCaseRjCode = track.rjCode.toLowerCase();
            const lowerCaseJapName = track.japName.toLowerCase();
            const lowerCaseEngName = track.engName.toLowerCase();

            // Check code
            if (lowerCaseCode.includes(lowerCaseKeyword) && !seen.has(`${track.code}_code`)) {
                results.push(new SearchResult("code", track.code, keyword, track.code));
                seen.add(`${track.code}_code`);
            }
            // Check rjCode
            if (lowerCaseRjCode.includes(lowerCaseKeyword) && !seen.has(`${track.rjCode}_rjCode`)) {
                results.push(new SearchResult("rjCode", track.rjCode, keyword, track.code));
                seen.add(`${track.rjCode}_rjCode`);
            }
            // Check cvs
            track.cvs.forEach(cv => {
                const lowerCaseCv = cv.toLowerCase();
                if (lowerCaseCv.includes(lowerCaseKeyword) && !seen.has(`${cv}_cv`)) {
                    results.push(new SearchResult("cv", cv, keyword, track.code));
                    seen.add(`${cv}_cv`);
                }
            });
            // Check tags
            track.tags.forEach(tag => {
                const lowerCaseTag = tag.toLowerCase();
                if (lowerCaseTag.includes(lowerCaseKeyword) && !seen.has(`${tag}_tag`)) {
                    results.push(new SearchResult("tag", tag, keyword, track.code));
                    seen.add(`${tag}_tag`);
                }
            });
            // Check series
            track.series.forEach(series => {
                const lowerCaseSeries = series.toLowerCase();
                if (lowerCaseSeries.includes(lowerCaseKeyword) && !seen.has(`${series}_series`)) {
                    results.push(new SearchResult("series", series, keyword, track.code));
                    seen.add(`${series}_series`);
                }
            });
            // Check english name
            if (lowerCaseEngName.includes(lowerCaseKeyword) && !seen.has(`${track.engName}_engName`)) {
                results.push(new SearchResult("engName", track.engName, keyword, track.code));
                seen.add(`${track.engName}_engName`);
            }
            // Check japanese name
            if (lowerCaseJapName.includes(lowerCaseKeyword) && !seen.has(`${track.japName}_japName`)) {
                results.push(new SearchResult("japName", track.japName, keyword, track.code));
                seen.add(`${track.japName}_japName`);
            }
        });

        results.sort(Utils.sortSuggestionFn);
        return results; 
    }
    static getTrackByIdentify(identify) {
        return Database.trackMap.get(identify) ?? Database.trackMap.get(Number(identify)) ?? Database.trackMap.get(Database.trackKeyMap.get(identify.toUpperCase()));
    }

    // Call when completed add data
    static completeBuild() {
        Utils.memoizeGetAndSearchMethods(Database);
        Database.sortByCode(true);
        [Database.cvMap, Database.tagMap, Database.seriesMap] = [Database.cvMap, Database.tagMap, Database.seriesMap].map(map => {
            return new Map([...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)));
        });
        console.timeEnd('Build Database Time');
        console.log('Added:', Database.keyList.length, 'Tracks');
        console.log('Complete build tracks map:', Database.trackMap);
        console.log('Complete build CVs map:', Database.cvMap);
        console.log('Complete build tags map:', Database.tagMap);
        console.log('Complete build series map:', Database.seriesMap);
        if(Database.config.test)
            Database.testingFunctions();
        if(Database.config.clearLog)
            setTimeout(() => console.clear(), 5000);
    }
    static testingFunctions() {
        if(!Database.config.log) return;
        Config.log = true;
        console.log('\n\n\n\n\n');
        console.time('Database functions testing time');
        console.log( 'Testing functions-----------------------------------------------------------------------');
        console.log( '\tGet category "cv" with keyword "kaede akino":', Database.getCategory(Database.categoryType.CV, 'kaede akino') );
        console.log( '\tGet category "tag" with keyword "armpit":', Database.getCategory(Database.categoryType.TAG, 'armpit') );
        console.log( '\tGet category "series" with keyword "platonicangels洗脳プロジェクト (platonicangels brainwashing project)":', Database.getCategory(Database.categoryType.SERIES, 'platonicangels洗脳プロジェクト (platonicangels brainwashing project)') );
        console.log( '\tGet search suggestions with keyword "Na"', Database.getSearchSuggestions('Na') );
        console.log( '\tGet all tracks by keyword "saka"', Database.searchTracksKey('saka') );
        console.log( '\tGet tracks by category "cv" with keyword "narumi aisaka"', Database.getTracksKeyByCategory(Database.categoryType.CV, 'narumi aisaka') );
        console.log( '\tGet tracks by category "tag" with keyword "elf"', Database.getTracksKeyByCategory(Database.categoryType.TAG, 'elf') );
        console.log( '\tGet tracks by category "series" with keyword "ドスケベjKシリーズ"', Database.getTracksKeyByCategory(Database.categoryType.SERIES, 'ドスケベjKシリーズ') );
        console.log( '\tGet tracks by identify with code "107613"', Database.getTrackByIdentify('107613') );
        console.log( '\tGet tracks by identify with RJcode "Rj377038"', Database.getTrackByIdentify('Rj377038') );
        console.log( '\tGet random 10 tracks', Database.getRandomTracksKey(10) );
        console.log( '\tGet random 20 tracks', Database.getRandomTracksKey(20) );
        console.log( 'End testing functions------------------------------------------------------------------');
        console.timeEnd('Database functions testing time');
        console.log('\n\n\n\n\n');
        Config.log = false;
        Database.config.log = false;
    }
}

((t0i0a = '') => {
    // https://www.pornhub.com/video/search?search=alekirser
    // https://www.pornhub.com/model/dudetlewd
    // https://www.pornhub.com/model/elly-audios
    // https://www.pornhub.com/model/yumprincess
    // https://www.pornhub.com/model/lemonkynn
    // https://www.pornhub.com/model/lewd_mumi
    // https://www.pornhub.com/model/babypinkaudio
    // https://www.pornhub.com/model/sugar-waifu
    // https://www.pornhub.com/model/pomeko_asmr
    // https://www.pornhub.com/model/sweetheartkiss
    // https://www.pornhub.com/model/mistress-pandara/videos
    // https://www.pornhub.com/model/r2moreasmrhot
    // https://www.pornhub.com/view_video.php?viewkey=64bad4870657b
    // https://www.pornhub.com/view_video.php?viewkey=ph6386704ed652a
    // https://www.pornhub.com/view_video.php?viewkey=65156698adba5
    // 
  
    at(1, '1', "Nightfawn", "Blowjob,English,Hand Job,Milf,Succubus,Tailjob", "", "A Virgin Visits A Monster Brothel", "", "https://cdn.glitch.global/8a12e68a-154b-4206-a6d7-dadd1141b198/ddf755fb-9863-433a-8cf2-4f0dcdc6b3db.image.png?v=1691559673421", "https://cdn.glitch.me/eefb1a2d-90ba-478b-b95a-dd50511909fe/SpankBang.com_mom%2Basmr%2Bwuhu_720p.mp4?v=1681911404572", "")
    at(2, '2', "Alekirser", "Blowjob,Ponytail,Incest,Younger Sister,English", "", "Truth or Dare With Your SLUTTY Babysitter | Audio ASMR Roleplay", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/2-1.jpg?v=1717673535421", "", "https://cdn.glitch.me/d8e66c1f-74c5-4053-808b-edf278b2a7e7/2-0.mp3?v=1717673534225")
    at(3, '3', "Alekirser", "Blowjob,Yandere,English", "", "Yandere Cutie is Obsessed With Your Cock ♡ | Audio ASMR Roleplay", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/3-0.jpg?v=1717682206278", "", "https://cdn.glitch.me/d8e66c1f-74c5-4053-808b-edf278b2a7e7/3-t1.mp3?v=1717682213644")
    at(4, '4', "Alekirser", "Blowjob,Step Mother,English", "", "Your Hot, Young Stepmom Wants You to Fuck Her! | ASMR Audio Roleplay", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/4-0.jpg?v=1717683383858", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/4-t1.mp3?v=1717683419692")
    at(5, '5', "SnakeySmut", "Blowjob,Anal,Ahegao,Dirty Talk,English", "", "Testing Your Best Friend's Hot Sister [Audio Porn] [Slut Training] [Use All My Holes]", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/5-0.jpg?v=1717685185860", "", "https://cdn.glitch.me/d8e66c1f-74c5-4053-808b-edf278b2a7e7/5-t1.mp3?v=1717685184708")
    at(6, '6', "Elly Audios", "Gym Clothes,Dirty Talk,English", "", "(ASMR) Your Gym Bunny GF Is Dripping Wet For You In The Gym", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/6-0.jpg?v=1717685359905", "", "https://cdn.glitch.me/d8e66c1f-74c5-4053-808b-edf278b2a7e7/6-t1.mp3?v=1717685364944")
    at(7, '7', "Elly Audios", "Blowjob,Breath,English", "", "Your Sister's Bff Wants To Warm Up & Break Around Your Cock Really Bad", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/7-0.jpg?v=1717685564313", "", "https://cdn.glitch.me/d8e66c1f-74c5-4053-808b-edf278b2a7e7/7-t1.mp3?v=1717685572417")
    at(8, '8', "Mommy Mari NSFW", "Little Step Sister,English", "", "Showing Your Little Step Sis How Babies Are Made!~", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/8-0.jpg?v=1717686355956", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/8-t1.mp3?v=1717686359851")
    at(9, '9', "LemonKynn", "Blowjob,English", "", "Erotic Audio RP - Reminding Your Free Use Roomate of Her Role", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/9-0.jpg?v=1717687426480", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/9-t1.mp3?v=1717687431138")
    at(10, '10', "LemonKynn", "Kouhai,English", "", "Erotic ASMR RP - Convenient Submissive Cocksucker +1 To Your Collection", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/10-0.jpg?v=1717689102845", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/10-t1.mp3?v=1717689107866")
    at(11, '11', "SoleilASMR", "Blowjob,Handjob,Twin Tails,English", "", "Your Good Girl Wakes You Up for a Sloppy Blowjob & Swallows Your Cum (ASMR Audio Porn Roleplay)", "", "https://cdn.glitch.global/d8e66c1f-74c5-4053-808b-edf278b2a7e7/11-0.jpg?v=1717689108953", "", "https://cdn.glitch.me/d8e66c1f-74c5-4053-808b-edf278b2a7e7/11-t1.mp3?v=1717689112003")
    at(12, "RJ01065824", "Meiya Yume", "3D,ASMR,Ahegao,Animation,Blowjob,Ear Licking,Foot Job,Futanari,Hand Job,Kissing,Peeing,Perverted,School Uniform,Vtuber,Video", "", "Meiya Yume Fantia Ona Support ASMR Compilation", "迷夜ゆめ ファンティアオナサポASMR総集編2022.9-2023.2", "https://cdn.glitch.global/cedb5300-5543-41d1-998d-e607a61661f4/rj01065824(0)?v=1694502918272", "https://cdn.glitch.global/cedb5300-5543-41d1-998d-e607a61661f4/RJ01065824_1.mp4?v=1694504395153,https://cdn.glitch.me/cedb5300-5543-41d1-998d-e607a61661f4/RJ01065824_2.mp4?v=1694504429342,https://cdn.glitch.me/cedb5300-5543-41d1-998d-e607a61661f4/RJ01065824_3.mp4?v=1694504466949,https://cdn.glitch.me/cedb5300-5543-41d1-998d-e607a61661f4/RJ01065824_4.mp4?v=1694504506876,https://cdn.glitch.me/cedb5300-5543-41d1-998d-e607a61661f4/RJ01065824_5.mp4?v=1694504532582,https://cdn.glitch.me/cedb5300-5543-41d1-998d-e607a61661f4/RJ01065824_6.mp4?v=1694504553862", "")
    at(13, "RJ01079769", "Aino Mimori", "Animation,Big Breasts,Assjob,Swimwear,School Swimwear,School Girl,Blowjob,Video,Live 2D,Dirty Talk,Tease", "", "Masochist hunting", "マゾ狩り", "https://cdn.glitch.global/36049008-0c55-496e-873e-a2f971037d73/RJ01079769-0.webp?v=1712133569025", "https://cdn.glitch.me/36049008-0c55-496e-873e-a2f971037d73/RJ01079769-1.mp4?v=1712133567460", "")
    at(14, '14', "", "", "", "engName", "", t0i0a)
    at(15, '15', "", "", "", "engName", "", t0i0a)
    at(16, '16', "", "", "", "engName", "", t0i0a)
    at(17, '17', "", "", "", "engName", "", t0i0a)
    at(18, '18', "", "", "", "engName", "", t0i0a)
    at(19, '19', "", "", "", "engName", "", t0i0a)
    at(20, '20', "", "", "", "engName", "", t0i0a)
    at(21, '21', "", "", "", "engName", "", t0i0a)
    at(22, '22', "", "", "", "engName", "", t0i0a)
    at(23, '23', "", "", "", "engName", "", t0i0a)
    at(24, '24', "", "", "", "engName", "", t0i0a)
    at(25, '25', "", "", "", "engName", "", t0i0a)
    at(26, '26', "", "", "", "engName", "", t0i0a)
    at(27, '27', "", "", "", "engName", "", t0i0a)
    at(28, '28', "", "", "", "engName", "", t0i0a)
    at(29, '29', "", "", "", "engName", "", t0i0a)
    at(30, '30', "", "", "", "engName", "", t0i0a)

    Database.completeBuild();
})();

function at(code, rjCode, cvs, tags, series, engName, japName, thumbnail, images, audios, otherLink) {
    Database.addTrackToDatabase(...arguments);
}

function generate(start, end) {
    str = ''
    for (let i = start; i <= end; i++) {
        str += `at(${i}, '${i}', "", "", "", "engName", "", t0i0a)\n`;
    }
    return str;
}