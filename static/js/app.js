'use strict';
/* jshint esversion: 8 */

let VueApp = {
    el: '#app',

    mounted: function () {

        // !!! Удалить ---------------------------------------
        let elem = document.querySelector('#temp-modal');
        M.Modal.init(elem);
        let instance = M.Modal.getInstance(elem);
        // instance.open();
        // ---------------------------------------------------

        // Счетчик времени до окончания мероприятия
        setInterval(() => {
            if (this.secondsToEnd && this.secondsToEnd > 0) {
                this.secondsToEnd--;
            }
        }, 1000);

        // Устанавливаем размер основных элементов
        // Пересчитываем размер основных элементов при изменении размера окна
        this.calcWidthHeight();
        window.addEventListener('resize', this.calcWidthHeight, {passive: true});

        // Для мобильного по умолчанию отключаем чат и видео
        if (this.windowWidth <= this.breakpoint.thresholds.m) {
            this.chat.isVisible = false;
        }
        if (this.breakpoint.s) {
            this.video.isVisible = false;
        }

        // Загружаем пользователей
        this.loadData('./data/users.json')
            .then((res) => {
                this.users = res;
                this.usersSortByName();
            });

    },

    data: {
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
            title: 'Название мероприятия, которое проходит в данный момент',

            isStarted: false,
            isPaused: false,
            isStopped: false,

            isIPCams: true,

            mainElement: 'presentation'
        },

        video: {
            isVisible: true,
        },

        presentation: {
            isVisible: true,
        },

        chat: {
            isVisible: true,
        },

        visitors: {
            isVisible: false,
            sortByNameAsc: true,
        },

        secondsToEnd: 0,

        windowWidth: 0,
        windowHeight: 0
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
            return moment('2000-01-01').seconds(this.secondsToEnd).format('HH:mm:ss');
        },

        isVideoMain: function () {
            return this.room.mainElement === 'video';
        },
        isPresentationMain: function () {
            return this.room.mainElement === 'presentation';
        },

        // Смещение относительно края экрана для видео и презентации
        styleSmallRight: function () {
            const delta = 350;
            return 10 + (this.chat.isVisible ? delta : 0) + (this.visitors.isVisible ? delta : 0);
        },

        // Работа с сеткой
        breakpoint: function () {
            const s = 600, m = 992, l = 1200;

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
            // У чата приоритет над списком пользователей на маленьких разрешениях
            if (val < this.breakpoint.thresholds.l && this.chat.isVisible) {
                this.visitors.isVisible = false;
            }

            // На маленьком разрешении отключем чат и посетителей
            if (val < this.breakpoint.thresholds.m) {
                this.chat.isVisible = false;
                this.visitors.isVisible = false;
            }

            // На маленьком разрешении отключем презентацию или видео
            if (val < this.breakpoint.thresholds.s) {
                this.video.isVisible = this.isVideoMain;
                this.presentation.isVisible = this.isPresentationMain;
            }
        }
    },

    methods: {
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


        // Методы управления чатом
        chatHideShow: function () {
            this.chat.isVisible = !this.chat.isVisible;

            // При включении чата
            if (this.chat.isVisible) {
                // На маленьком рзрешении, если включается чат, выключаем список посетителей
                if (this.windowWidth < this.breakpoint.thresholds.l) {
                    this.visitors.isVisible = false;
                }
                // Для мобильника отключаем видео и презентацию
                if (this.breakpoint.s) {
                    this.video.isVisible = false;
                    this.presentation.isVisible = false;
                }
            }
        },


        // Методы управления посетителями
        visitorsHideShow: function () {
            this.visitors.isVisible = !this.visitors.isVisible;

            // При включении посетителей
            if (this.visitors.isVisible) {
                // На маленьком рзрешении, если включается чат, выключаем список посетителей
                if (this.windowWidth < this.breakpoint.thresholds.l) {
                    this.chat.isVisible = false;
                }
                // Для мобильника отключаем видео и презентацию
                if (this.breakpoint.s) {
                    this.video.isVisible = false;
                    this.presentation.isVisible = false;
                }
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


        // Методы управления видео
        videoHideShow: function () {
            this.video.isVisible = !this.video.isVisible;

            // При выключении видео делаем главной презентацию
            if (!this.video.isVisible) {
                this.presentation.isVisible = true;
                this.setPresentationMain();
            }

            // Для мобильника отключаем все кроме видео
            if (this.video.isVisible && this.breakpoint.s) {
                this.setVideoMain();

                this.presentation.isVisible = false;
                this.chat.isVisible = false;
                this.visitors.isVisible = false;
            }
        },
        setVideoMain: function () {
            this.room.mainElement = 'video';
        },

        // Методы управления презентацией
        presentationHideShow: function () {
            this.presentation.isVisible = !this.presentation.isVisible;

            // При выключении презентации делаем главной видео
            if (!this.presentation.isVisible) {
                this.video.isVisible = true;
                this.setVideoMain();
            }

            // Для мобильника отключаем все кроме презентации
            if (this.presentation.isVisible && this.breakpoint.s) {
                this.setPresentationMain();

                this.video.isVisible = false;
                this.chat.isVisible = false;
                this.visitors.isVisible = false;
            }
        },
        setPresentationMain: function () {
            this.room.mainElement = 'presentation';
        },

        // Вычисляем размер окна
        calcWidthHeight: function () {
            let w = window,
                d = document,
                e = d.documentElement,
                g = d.getElementsByTagName('body')[0];

            this.windowWidth = w.innerWidth || e.clientWidth || g.clientWidth;
            this.windowHeight = w.innerHeight || e.clientHeight || g.clientHeight;
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
        }
    }
};

