import Config from "../app/Config.class.js";
import Utils from "../Utils.class.js";
import { Cv, OtherLink, SearchResult, Series, Tag, Track } from "./classes.js";

console.time('Build Database Time');
export default class Database {
    static config = {
        log: false,
        test: false,
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

    static setData(data) {
        data.forEach(record => Database.addTrackToDatabase(...record));
        Database.completeBuild();
    }

    static addTrackToDatabase(code, rjCode, cvs, tags, series, engName, japName, thumbnail, images, audios, otherLinks = undefined) {
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