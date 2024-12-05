'use strict';

const urlParams = new URLSearchParams(window.location.search);

class App {
    static types = {
        HOME: 0,
        WATCH: 1
    }
    static reuableElements = { hiddenItemBox: undefined }

    static build(type = App.types.HOME) {
        console.time(`Build app time`);
        // Common Build
        App.reuableElements.hiddenItemBox = document.querySelector('#hidden-info-box');
        App.buildHeaderAction();
        App.buildMenuAction();
        App.buildCategoriesModalView();
        App.buildCategoriesModalAction();
        App.buildGachaModalAction();
        document.querySelector('.back-item').addEventListener('click', () => window.history.back());
        document.querySelector('.reload-item').addEventListener('click', () => window.location.reload());
        document.querySelector('.forward-item').addEventListener('click', () => window.history.forward());

        switch (type) {
            case App.types.HOME: Home.build(); break;
            case App.types.WATCH: Watch.build(); break;
            default: throw new Error('Invalid app type');
        }

        App.completedBuildApp();
    }

    // For search box
    static buildHeaderAction() {
        const mainSearchInput = document.querySelector('#main-search-input');
        const mainSearchIcon = document.querySelector('#main-search-icon');
        const resultBox = document.querySelector('.result-box');

        mainSearchInput.addEventListener('blur', Config.hideResultBox);
        mainSearchInput.addEventListener('input', () => search(mainSearchInput.value));
        mainSearchInput.addEventListener('click', Config.showResultBox);
        mainSearchInput.addEventListener('focus', () => document.body.addEventListener('keyup', getEnter));
        mainSearchInput.addEventListener('blur', () => document.body.removeEventListener('keyup', getEnter));
        mainSearchIcon.addEventListener('click', () => {
            const searchValue = mainSearchInput.value;
            if (searchValue) {
                mainSearchInput.value = '';
                if (!developerSearch(searchValue)) {
                    window.location = `${window.location.href.includes('s2') ? '/s2' : ''}/?search=${encodeURIComponent(searchValue)}`;
                }
            }
        });

        function getEnter(event) {
            if (event.key == 'Enter') {
                const searchValue = mainSearchInput.value;
                if (searchValue) {
                    mainSearchInput.value = '';
                    if (!developerSearch(searchValue)) {
                        window.location = `${window.location.href.includes('s2') ? '/s2' : ''}/?search=${encodeURIComponent(searchValue)}`;
                    }
                }
            }
        }
      
        function search(value) {
            const splittedValue = value.split('+').map(v => v.trim()).filter(v => v);

            if (value == '') {
                resultBox.innerHTML = '';
                Config.hideResultBox();
                return;
            }

            if (value.includes('@') && !window.location.href.includes('s2')) {
                resultBox.innerHTML = /*html*/`
                    <a href="../?search=@n"><span style="color: #00BFFF;">►</span><strong>@n</strong>: <span class="cnt">View newest tracks</span></a>
                    <a href="../dev/list-code"><span style="color: #00BFFF;">►</span><strong>@lc or @listcode</strong>: <span class="cnt">View list code</span></a>
                    <a href="../dev/data-capacity"><span style="color: #00BFFF;">►</span><strong>@dc or @datacapacity</strong>: <span class="cnt">View data capacity</span></a>
                    <a href="https://japaneseasmr.com/"><span style="color: #00BFFF;">►</span><strong>@ja</strong>: <span class="cnt">Japanese ASMR</span></a>
                    <a href="https://www.asmr.one/works"><span style="color: #00BFFF;">►</span><strong>@ao</strong>: <span class="cnt">ASMR ONE</span></a>
                `;
                Config.showResultBox();
                return;
            }

            let suggestions = Utils.filterUniqueObjects(splittedValue.reduce(
                (arrOfSuggestion, v) => {
                    return arrOfSuggestion.concat( Database.getSearchSuggestions(v) );
                }, []
            )).sort(Utils.sortSuggestionFn);
            
            if (suggestions.length == 0) {
                resultBox.innerHTML = `<a style="text-align:center;">-No Result-</a>`;
            } else {
                resultBox.innerHTML = suggestions.reduce((html, searchResult) => html.concat(searchResult.getHtml()), '');
            }
            Config.showResultBox();
        }
      
        function developerSearch(value) {
            let active = false;
            if (value.indexOf('@') == -1)
                return active;

            const options = ['lc', 'listcode', 'dc', 'datacapacity', 'ja', 'ao']
            const links = [
                '../dev/list-code', '../dev/list-code', '../dev/data-capacity', '../dev/data-capacity',
                'https://japaneseasmr.com/', 'https://www.asmr.one/works'
            ]
            const optionBeforeSplit = value
            const optionAfterSplit = optionBeforeSplit.split('-')
            const option = options.indexOf(optionAfterSplit[0].replaceAll('@', ''))
            if (option != -1) {
                active = true;
                optionAfterSplit[1] == 'b'
                    ? window.open(links[option], '_blank')
                    : window.location = links[option]
            }
            return active;
        }
    }

    // For menu
    static buildMenuAction() {
        const toggleMenuBtn = document.querySelector('#toggle-menu-btn');
        const closeMenuBtn = document.querySelector('#close-menu-btn');

        toggleMenuBtn.addEventListener('click', Config.toggleMenu);
        closeMenuBtn.addEventListener('click', Config.closeMenu);
        new SwipeHandler(document.body,
            () => document.querySelector('.open') ? undefined : Config.openMenu(),
            () => document.querySelector('.open') ? undefined : Config.closeMenu()
        ).registerEvents();
    }

    // For categories modal
    static buildCategoriesModalView() {
        const [rankListCvCtn, rankListTagCtn, rankListSeriesCtn] = ['.rank-list-grid-item.cv-b', '.rank-list-grid-item.tag-b', '.rank-list-grid-item.series-b'].map(selector => document.querySelector(selector));
        const [listCvCtn, listTagCtn, listSeriesCtn] = [rankListCvCtn, rankListTagCtn, rankListSeriesCtn].map(ctn => ctn.querySelector('.links'));
        const listLength = [Database.cvMap, Database.tagMap, Database.seriesMap].map(map => map.size);
        const types = ['cv', 'tag', 'series'];
        let htmls = Array(3).fill('');

        [rankListCvCtn, rankListTagCtn, rankListSeriesCtn].forEach((ctn, index) => ctn.querySelector('.title').textContent += ` (${listLength[index]})`);
        [Database.cvMap, Database.tagMap, Database.seriesMap].forEach((map, index) => {
            map.forEach(value => {
                const { name, quantity } = value;
                htmls[index] += /*html*/`<a href="${window.location.href.includes('s2') ? '/s2' : ''}/?${types[index]}=${encodeURIComponent(name)}" class="item" quantity="${quantity}">${name}</a>`;
            });
        });

        const [cvHtml, tagHtml, seriesHtml] = htmls;
        listCvCtn.innerHTML = cvHtml;
        listTagCtn.innerHTML = tagHtml;
        listSeriesCtn.innerHTML = seriesHtml;
    }
    static buildCategoriesModalAction() {
        const categoriesModal = document.querySelector('#categories-modal');
        const accordions = categoriesModal.querySelectorAll('.accordion-header');
        const btnOpenCategoryModal = document.querySelector('#open-categories-modal-btn');
        const btnCloseCategoryModal = categoriesModal.querySelector('#close-categories-modal-btn');
        const subRankList = categoriesModal.querySelectorAll('.sub-rank-list');

        accordions.forEach(accordion => {
            accordion.addEventListener('click', () => {
                accordion.classList.toggle('active');
                let panel = accordion.nextElementSibling;
                if (panel.style.maxHeight) {
                    panel.style.maxHeight = null;
                } else {
                    panel.style.maxHeight = panel.scrollHeight + 'px';
                }
            });
            if(!Config.deviceIsMobile()) {
                setTimeout(() => accordion.dispatchEvent(new Event('click')), 200);
            }
        });
        subRankList.forEach(subRankBox => {
            const searchBox = subRankBox.querySelector('input.search');
            const sortTypeSelect = subRankBox.querySelector('select');
            const linkContainer = subRankBox.querySelector('.links');
            const listOfLinks = linkContainer.querySelectorAll('a.item');

            searchBox.addEventListener('input', () => {
                const keyword = searchBox.value.trim().toLowerCase();

                if (keyword) {
                    listOfLinks.forEach(link => {
                        if (link.textContent.toLowerCase().includes(keyword)) {
                            link.style.display = "block";
                            link.innerHTML = Utils.removeHighlight(link.innerHTML);
                            link.innerHTML = Utils.highlight(link.innerHTML, keyword);
                            return;
                        }
                        link.style.display = "none";
                    });
                    const sortedListOfLinks = Array.from(listOfLinks).sort((a, b) => a.textContent.toLowerCase().indexOf(keyword) - b.textContent.toLowerCase().indexOf(keyword));
                    sortedListOfLinks.forEach(link => linkContainer.appendChild(link));
                    return;
                }

                listOfLinks.forEach(link => {
                    link.style.display = "block";
                    link.innerHTML = Utils.removeHighlight(link.innerHTML);
                });
                sortTypeSelect.dispatchEvent(new Event('input'));
            });

            sortTypeSelect.addEventListener('input', () => {
                let sortedListOfLinks = null;

                switch (sortTypeSelect.value.toLowerCase()) {
                    case 'name':
                        sortedListOfLinks = Array.from(listOfLinks).sort((a, b) => a.textContent.localeCompare(b.textContent));
                        break;
                    case 'quantity':
                        sortedListOfLinks = Array.from(listOfLinks).sort((a, b) => Number(b.getAttribute('quantity')) - Number(a.getAttribute('quantity')));
                        break;
                    default:
                        throw new Error('Invalid sort type');
                }

                sortedListOfLinks.forEach(link => linkContainer.appendChild(link));
            });
        });
        btnOpenCategoryModal.addEventListener('click', openCatgoriesModal);
        btnCloseCategoryModal.addEventListener('click', closeCatgoriesModal);
        categoriesModal.addEventListener('click', event => {
            if(event.target.classList.contains('modal-container')) {
                closeCatgoriesModal();
            }
        });

        function openCatgoriesModal() {
            categoriesModal.classList.add('open');
            document.body.classList.add('openModal');
        }
      
        function closeCatgoriesModal() {
            categoriesModal.classList.remove('open');
            document.body.classList.remove('openModal');
        }
    }
  
    // For gacha modal
    static buildGachaModalAction() {
        const gachaModal = document.querySelector('#gacha-modal');
        const gridGachaModal = gachaModal.querySelector('.gacha-grid-container');
        const btnOpenGachaModal = document.querySelector('#open-gacha-modal-btn');
        const btnCloseGachaModal = gachaModal.querySelector('#close-gacha-modal-btn');
        const gacha1 = gachaModal.querySelector('#gachaX1');
        const gacha10 = gachaModal.querySelector('#gachaX10');
      
        gridGachaModal.innerHTML = ''; // Reset HTML
        btnOpenGachaModal.addEventListener('click', openGachaModal);
        btnCloseGachaModal.addEventListener('click', closeGachaModal);
        gachaModal.addEventListener('click', event => {
            if(event.target.classList.contains('modal-container')) {
                closeGachaModal();
            }
        });

        function openGachaModal() {
            gachaModal.classList.add('open');
            document.body.classList.add('openModal');
        }
        function closeGachaModal() {
            gachaModal.classList.remove('open');
            document.body.classList.remove('openModal');
        }

        let onG10Anim = false;
        gacha10.addEventListener('click', () => {
            if(onG10Anim) return;

            gacha10.classList.add('active');
            onG10Anim = true;
            gacha10.addEventListener('transitionend', function() {
                setTimeout(() => {
                    this.classList.remove('active');
                    this.style.setProperty('--transition-time', '.15s');
                    this.addEventListener('transitionend', () => {
                        this.style.setProperty('--transition-time', null);
                        onG10Anim = false;
                    }, { once: true });
                }, 100);
            }, { once: true });

            const shards = document.querySelectorAll('.shard');
            const screenWidth = screen.width;
            const screenHeight = screen.height;
            const avgDimension = (screenWidth + screenHeight) / 2;
            const usedPositions = []; // Mảng lưu trữ các vị trí đã dùng

            shards.forEach((shard) => {
                let xTranslate, yTranslate, distance;
                shard.opacity = 1;

                // Xác định vị trí sao cho không bị trùng hoặc quá gần các mảnh khác
                do {
                    xTranslate = (Math.random() - 0.5) * (avgDimension * 0.2); // Khoảng cách bay 20% của avgDimension
                    yTranslate = (Math.random() - 0.5) * (avgDimension * 0.2); // Khoảng cách bay 20% của avgDimension

                    // Tính khoảng cách từ vị trí (xTranslate, yTranslate) đến các vị trí đã sử dụng
                    distance = usedPositions.every(pos => {
                        const dx = xTranslate - pos.x;
                        const dy = yTranslate - pos.y;
                        return Math.sqrt(dx * dx + dy * dy) > avgDimension * 0.05; // Đảm bảo khoảng cách tối thiểu là 5% của avgDimension
                    });
                } while (!distance);

                // Lưu vị trí này vào mảng usedPositions
                usedPositions.push({ x: xTranslate, y: yTranslate });

                // Kích thước của mỗi shard (tỉ lệ theo avgDimension)
                shard.style.width = `${avgDimension * 0.015}px`; // 1.5% của avgDimension
                shard.style.height = `${avgDimension * 0.015}px`; // 1.5% của avgDimension

                // Thời gian bay của mỗi shard
                let duration = 800;

                // Tạo animation với animate()
                shard.animate([
                    { transform: 'translate(0, 0)', filter: 'brightness(1.5)', opacity: 1 },
                    { transform: `translate(${xTranslate}px, ${yTranslate}px) rotate(${180}deg)`, filter: 'brightness(1.5)', opacity: 1 },
                    { transform: `translate(${xTranslate}px, ${yTranslate + Math.abs(yTranslate/2)}px) rotate(${270}deg)`, filter: 'brightness(1.0)', opacity: 1 },
                    { transform: `translate(${xTranslate}px, ${yTranslate + Math.abs(yTranslate)}px) rotate(${360}deg)`, opacity: 0 }
                ], {
                    duration: duration,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
            });
        });
      
        gacha10.addEventListener('click', function() { gacha(this.dataset.count) });
        gacha1.addEventListener('click', function() { gacha(this.dataset.count) });
      
        function gacha(count) {
            const trackKeys = Database.getRandomTracksKey(count);
          
            gridGachaModal.innerHTML = ''; // Reset HTML
            gachaModal.querySelector('.gacha-modal-body').scrollTop = 0;
            trackKeys.forEach((key, index) => {
                const track = Database.trackMap.get(key);
                const element = track.getGridItemElement();
                gridGachaModal.appendChild(element);
                
                track.addActionDisplayHiddenItemFor(element.querySelector('.image-container'));
                console.log(element.querySelector('.image-container'));
                element.style.opacity = "0";
                setTimeout(()=>{
                    element.style.opacity = "1";
                }, (index + 1) * 100);
            });
        }
    }

    // Call when complete build app
    static completedBuildApp() {
        App.startSendAppStatus();
        document.body.style.display = 'block';
        window.addEventListener('load', ()=>{
            const loadTime = window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart;
            console.log(`Loading time: ${loadTime} ms`);
        });
        console.timeEnd(`Build app time`);        
    }
    static startSendAppStatus() {
        // Send status to the app that embeds this app
        parent.postMessage({ type: 'urlChange', version: 2.2, url: window.location.href }, '*');
        setInterval(() => parent.postMessage({ type: 'alive' }, '*'), 3000);
        window.addEventListener('beforeunload', () => parent.postMessage({ type: 'beforeUnload' }, '*'));
    }
}