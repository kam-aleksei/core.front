"use strict";
/* jshint esversion: 8 */

let VueApp = {
    el: "#app",
    mounted: function () {
        this.setDefaultBlocksState();
        this.room.mainElement = this.BLOCKS.PRESENTATION;
        // Счетчик времени до окончания мероприятия
        setInterval(() => {
            if (this.secondsToEnd && this.secondsToEnd > 0) {
                this.secondsToEnd--;
            }
        }, 1000);

        // Устанавливаем размер основных элементов
        // Пересчитываем размер основных элементов при изменении размера окна
        this.calcWidthHeight();
        window.addEventListener("resize", this.calcWidthHeight, {passive: true});
        window.addEventListener("orientationchange", this.calcWidthHeight, {passive: true});

        // Захватываем камеру
        this.videoHolder = document.getElementById("video-holder");
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({video: true})
                .then(stream => {
                    this.videoHolder.srcObject = stream;
                })
                .catch(function (error) {
                    console.log("Something went wrong!");
                });
        }

        // Загружаем пользователей
        this.loadData("./data/users.json")
            .then((res) => {
                this.users = res;
                this.usersSortByName();
            });

        // Загружаем сообщения чата
        this.loadData("./data/chat.json")
            .then((res) => {
                this.chat.messages = res;
            });

        this.windowWidthEventHandler(this.windowWidth);
    },

    data: {
        md: new MobileDetect(window.navigator.userAgent),
        orientation: undefined,
        // Текущий пользователь
        user: {
            id: 1,
            cam: true,
            mic: true,
            leading: true,
        },

        // Пользователи в комнате
        users: [],

        // Комната
        room: {
            title: "Название мероприятия, которое проходит в данный момент",

            isStarted: false,
            isPaused: false,
            isStopped: false,

            isIPCams: true,

            mainElement: undefined,
        },

        video: {
            isVisible: true,
            videoHolder: undefined
        },

        presentation: {
            isVisible: true,
        },

        chat: {
            isVisible: true,
            messages: []
        },

        visitors: {
            isVisible: true,
            sortByNameAsc: true,

            list: []
        },

        secondsToEnd: 0,

        windowWidth: 0,
        windowHeight: 0,
        currentMode: undefined,
        modeSwitch: false,

        BLOCKS: {
            VIDEO: "video",
            PRESENTATION: "presentation",
            CHAT: "chat",
            VISITORS: "visitors"
        },
        MODES: {
            SMALL: "small",
            MEDIUM: "medium",
            LARGE: "large",
        },

        blocksState: undefined
    },

    computed: {
        isShowStartButton: function () {
            return !this.room.isStarted || this.room.isPaused;
        },
        isShowPauseButton: function () {
            return this.room.isStarted && !this.room.isPaused;
        },
        isShowStopButton: function () {
            return this.room.isStarted;
        },

        timeToEndString: function () {
            return moment("2000-01-01").seconds(this.secondsToEnd).format("HH:mm:ss");
        },

        isVideoMain: function () {
            return this.room.mainElement === this.BLOCKS.VIDEO;
        },
        isPresentationMain: function () {
            return this.room.mainElement === this.BLOCKS.PRESENTATION;
        },

        // Смещение относительно края экрана для видео и презентации, если они маленькие
        styleSmallRight: function () {
            const delta = 350;
            return 10 + (this.chat.isVisible ? delta : 0) + (this.visitors.isVisible ? delta : 0);
        },
        stylePresentationSmallRight: function () {
            return this.isPresentationMain ? 0 : this.styleSmallRight;
        },
        styleVideoSmallRight: function () {
            return this.isVideoMain ? 0 : this.styleSmallRight;
        },

        // Работа с сеткой
        breakpoint: function () {
            const s = 669, m = 992, l = 1200;

            return {
                thresholds: {
                    s: s,
                    m: m,
                    l: l,
                },
                s: this.windowWidth <= s,
                m: s < this.windowWidth <= m,
                l: m < this.windowWidth <= l,
                xl: this.windowWidth > l
            };
        }
    },

    watch: {
        windowWidth: function (val) {
            this.windowWidthEventHandler(val);
        }
    },

    methods: {
        setDefaultBlocksState: function(){
            this.blocksState = {
                small: {
                    active: {
                        top: this.BLOCKS.VIDEO,
                        bottom: this.BLOCKS.PRESENTATION
                    },
                    inactive: [
                        this.BLOCKS.CHAT,
                        this.BLOCKS.VISITORS
                    ]
                },
                medium: {
                    main: this.BLOCKS.PRESENTATION,
                    inactive: [
                        this.BLOCKS.VISITORS
                    ]
                },
                large: {
                    main: this.BLOCKS.PRESENTATION,
                    inactive: []
                }
            };
        },
        deviceIsMobile: function () {
            return this.md.phone() || this.md.tablet();
        },
        currentModeIsSmall: function () {
            return this.currentMode === this.MODES.SMALL;
        },
        currentModeIsMedium: function () {
            return this.currentMode === this.MODES.MEDIUM;
        },
        currentModeIsLarge: function () {
            return this.currentMode === this.MODES.LARGE;
        },
        currentOrientationIsPortrait: function () {
            return this.orientation === "portrait";
        },
        currentOrientationIsAlbum: function () {
            return this.orientation === "album";
        },
        windowWidthEventHandler: function (val) {
            let mode;

            if (
                this.deviceIsMobile()
            ) {
                mode = this.MODES.SMALL;
            } else {
                if (val < this.breakpoint.thresholds.s) {
                    mode = this.MODES.SMALL;
                } else if (val < this.breakpoint.thresholds.m) {
                    mode = this.MODES.MEDIUM;
                } else {
                    mode = this.MODES.LARGE;
                }
            }
            if (this.currentMode !== mode && this.modeSwitch === false) {
                this.currentMode = mode;
                this.getBlocksState(mode);
                this.modeSwitch = true;
            } else {
                this.modeSwitch = false;
            }
        },

        // Методы управления мероприятием
        roomStartResume: function () {
            // Первый запуск инициализируем время до окончания
            if (!this.room.isStarted) {
                this.secondsToEnd = 6000;
            }

            this.room.isStarted = true;
            this.room.isPaused = false;
        },
        roomPause: function () {
            this.room.isPaused = true;
        },
        roomStop: function () {
            this.room.isStopped = true;
            this.secondsToEnd = 0;
        },
        // Методы управления чатом ---------------------------------------------------------------------
        chatHideShow: function () {
            this.chat.isVisible = !this.chat.isVisible;

            // При включении чата
            if (this.chat.isVisible) {
                let pos = this.blocksState[this.currentMode].inactive.indexOf(this.BLOCKS.CHAT);
                this.blocksState[this.currentMode].inactive.splice(pos, 1);
                // На маленьком рзрешении, если включается чат, выключаем список посетителей
                if (this.windowWidth < this.breakpoint.thresholds.l) {
                    this.visitors.isVisible = false;
                    this.setBlockInactive(this.BLOCKS.VISITORS);
                }
            } else {
                this.setBlockInactive(this.BLOCKS.CHAT);
            }

            this.setBlocksState();
        },

        // Удаление собщения по id
        deleteMessageByID: function (id) {
            this.chat.messages = this.chat.messages.filter(a => a.id !== id);
        },

        // Методы управления посетителями ----------------------------------------------------------------
        visitorsHideShow: function () {
            this.visitors.isVisible = !this.visitors.isVisible;

            // При включении посетителей
            if (this.visitors.isVisible) {
                let pos = this.blocksState[this.currentMode].inactive.indexOf(this.BLOCKS.VISITORS);
                this.blocksState[this.currentMode].inactive.splice(pos, 1);
                // На маленьком рзрешении, если включается чат, выключаем список посетителей
                if (this.windowWidth < this.breakpoint.thresholds.l) {
                    this.chat.isVisible = false;
                    this.setBlockInactive(this.BLOCKS.CHAT);
                }
            } else {
                this.setBlockInactive(this.BLOCKS.VISITORS);
            }
            this.setBlocksState();
        },

        // Имя пользователя по id
        userNameByID: function (id) {
            try {
                return this.users.find(a => a.id === id).name;
            } catch (e) {
                return "undefined";
            }
        },

        // Проверка является ли пользователь ведущим по id
        isUserLeadingByID: function (id) {
            try {
                return this.users.find(a => a.id === id).leading;
            } catch (e) {
                return false;
            }
        },

        // Корректировка списка пользователей
        // Первые ведущий и участник
        usersTop: function () {
            this.users = this.users.sort((a, b) => {
                let a_prior = a.leading ? 0 : a.id === this.user.id ? 5 : 9,
                    b_prior = b.leading ? 0 : b.id === this.user.id ? 5 : 9;
                return a_prior - b_prior;
            });
        },

        // Сортировка пользователей по алфавиту
        usersSortByName: function () {
            let direction = this.visitors.sortByNameAsc ? 1 : -1;
            this.users = this.users.sort((a, b) => {
                return (a.name === b.name ? 0 : a.name > b.name ? 1 : -1) * direction;
            });
            this.usersTop();

            // Инверсия сортировки для следующего нажатия
            this.visitors.sortByNameAsc = !this.visitors.sortByNameAsc;
        },

        // Сортировка пользователей по поднятым рукам
        usersSortByHand: function () {
            this.users = this.users.sort((a, b) => {
                return a.hand === b.hand ? 0 : a.hand > b.hand ? -1 : 1;
            });
            this.usersTop();

            // Следующая сортировка по именам должна быть по возрастанию
            this.visitors.sortByNameAsc = true;
        },


        // Методы управления видео ---------------------------------------------------------------------------
        videoHideShow: function () {
            this.video.isVisible = !this.video.isVisible;

            // При выключении видео делаем главной презентацию
            if (!this.video.isVisible) {
                if(!this.currentModeIsSmall()){
                    this.setBlockInactive(this.BLOCKS.VIDEO, this.MODES.LARGE);
                    this.setBlockInactive(this.BLOCKS.VIDEO, this.MODES.MEDIUM);
                }else{
                    this.setBlockInactive(this.BLOCKS.VIDEO);
                }
            } else {
                if(!this.currentModeIsSmall()){
                    this.setBlockActive(this.BLOCKS.VIDEO, this.MODES.LARGE);
                    this.setBlockActive(this.BLOCKS.VIDEO, this.MODES.MEDIUM);
                }else{
                    this.setBlockActive(this.BLOCKS.VIDEO);
                }
            }

            this.setBlocksState();
        },
        setVideoMain: function () {
            this.room.mainElement = this.BLOCKS.VIDEO;
            this.blocksState.medium.main = this.BLOCKS.VIDEO;
            this.blocksState.large.main = this.BLOCKS.VIDEO;
            this.setBlocksState();
        },


        // Методы управления презентацией ----------------------------------------------------------------------
        presentationHideShow: function () {
            this.presentation.isVisible = !this.presentation.isVisible;

            // При выключении презентации делаем главной видео
            if (!this.presentation.isVisible) {
                if(!this.currentModeIsSmall()){
                    this.setBlockInactive(this.BLOCKS.PRESENTATION, this.MODES.LARGE);
                    this.setBlockInactive(this.BLOCKS.PRESENTATION, this.MODES.MEDIUM);
                }else{
                    this.setBlockInactive(this.BLOCKS.PRESENTATION);
                }
            } else {
                if(!this.currentModeIsSmall()){
                    this.setBlockActive(this.BLOCKS.PRESENTATION, this.MODES.LARGE);
                    this.setBlockActive(this.BLOCKS.PRESENTATION, this.MODES.MEDIUM);
                }else{
                    this.setBlockActive(this.BLOCKS.PRESENTATION);
                }
            }
            this.setBlocksState();
        },
        setPresentationMain: function () {
            this.room.mainElement = this.BLOCKS.PRESENTATION;
            this.blocksState.medium.main = this.BLOCKS.PRESENTATION;
            this.blocksState.large.main = this.BLOCKS.PRESENTATION;
            this.setBlocksState();
        },
        // Системное ----------------------------------------------------------------------------------------

        // Вычисляем размер окна
        calcWidthHeight: function () {
            let w = window,
                d = document,
                e = d.documentElement,
                g = d.getElementsByTagName("body")[0];

            this.windowWidth = verge.viewportW() || w.innerWidth || e.clientWidth || g.clientWidth;
            this.windowHeight = verge.viewportH() || w.innerHeight || e.clientHeight || g.clientHeight;

            if(this.windowWidth > this.windowHeight){
                this.orientation = "album";
            }else{
                this.orientation = "portrait";
            }
        },

        // Загрузка данных
        loadData: async function (url) {
            let response = await fetch(url);

            if (response.ok) { // если HTTP-статус в диапазоне 200-299
                // получаем тело ответа (см. про этот метод ниже)
                return await response.json();
            } else {
                console.log("Ошибка HTTP: " + response.status);
            }
        },
        // Методы для маленького режима -----------------------
        smallModeCheckButtonsVisibility: function (name) {
            return this.blocksState.small.inactive.indexOf(name) !== -1;
        },
        smallModeSwitchTopBlock: function (block) {
            this.smallModeSwitchBlock("top", block);
        },
        smallModeSwitchBottomBlock: function (block) {
            this.smallModeSwitchBlock("bottom", block);
        },
        smallModeSwitchBlock: function (position, block) {
            let prevBlock = this.blocksState.small.active[position];
            let index = this.blocksState.small.inactive.indexOf(block);
            this.$set(this.blocksState.small.active, position, block);
            this.$set(this.blocksState.small.inactive, index, prevBlock);
            this[prevBlock].isVisible = false;
            this[block].isVisible = true;
            this.setBlocksState();
        },
        smallModeBlockIsTop: function (block) {
            return this.blocksState.small.active.top === block;
        },
        smallModeBlockIsBottom: function (block) {
            return this.blocksState.small.active.bottom === block;
        },
        smallModeSwitchTopPresentationBlock: function(){
            this.smallModeSwitchBlock("top", this.BLOCKS.CHAT);
        },
        // ------------------------------------------------------
        setBlockInactive: function(block, mode = this.currentMode){
            if(this.blocksState[mode].inactive.indexOf(block) === -1){
                this.blocksState[mode].inactive.push(block);
            }
        },
        setBlockActive: function(block, mode = this.currentMode){
                let pos = this.blocksState[mode].inactive.indexOf(block);
                this.blocksState[mode].inactive.splice(pos, 1);
        },

        getBlocksState: function (mode) {
            let blocksState = localStorage.getItem("blocksState");
            if (blocksState) {
                this.blocksState = JSON.parse(blocksState);
            }
            this.setModeState(mode);
        },
        setModeState: function (mode) {
            switch (mode) {
                case this.MODES.SMALL:
                    this.setSmallMode();
                    break;
                case this.MODES.MEDIUM:
                    this.setMediumMode();
                    break;
                case this.MODES.LARGE:
                    this.setLargeMode();
                    break;
                default:
                    break;
            }
        },

        setSmallMode: function () {
            this[this.blocksState.small.active.top].isVisible = true;
            this[this.blocksState.small.active.bottom].isVisible = true;
            this[this.blocksState.small.inactive[0]].isVisible = false;
            this[this.blocksState.small.inactive[1]].isVisible = false;
        },
        setMediumMode: function () {
            this.room.mainElement = this.blocksState.medium.main;
            this.setAllBlocksVisible();
            if (this.blocksState.medium.inactive.length > 0) {
                for (const block of this.blocksState.medium.inactive) {
                    this[block].isVisible = false;
                }
            }
        },
        setLargeMode: function () {
            this.room.mainElement = this.blocksState.large.main;
            this.setAllBlocksVisible();
            if (this.blocksState.large.inactive.length > 0) {
                for (const block of this.blocksState.large.inactive) {
                    this[block].isVisible = false;
                }
            }
        },

        setBlocksState: function () {
            localStorage.setItem("blocksState", JSON.stringify(this.blocksState));
        },
        setAllBlocksVisible: function () {
            this.video.isVisible = true;
            this.presentation.isVisible = true;
            this.chat.isVisible = true;
            this.visitors.isVisible = true;
        }
    }
};

