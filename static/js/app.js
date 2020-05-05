'use strict';
/* jshint esversion: 6 */

let VueApp = {
    el: '#app',
    vuetify: new Vuetify(),

    mounted: function () {

        // Счетчик времени до окончания мероприятия
        setInterval(() => {
            if (this.secondsToEnd && this.secondsToEnd > 0) {
                this.secondsToEnd--;
            }
        }, 1000);

        // Для мобильного по умолчанию отключаем чат
        if (this.$vuetify.breakpoint.xs) {
            this.chat.isVisible = false;
        }

        // Устанавливаем высоту основных элементов
        this.calcMainElementHeight();

        // Пересчитываем высоту при изменении размера окна
        window.addEventListener('resize', this.calcMainElementHeight, { passive: true });
    },

    data: {
        room: {
            title: 'Название мероприятия, которое прохдит в данный момент',

            isStarted: false,
            isPaused: false,
            isStopped: false,
        },

        video: {
            isVisible: true
        },

        chat: {
            isVisible: true
        },

        visitors: {
            isVisible: false
        },

        secondsToEnd: 0,

        mainElementHeight: 0
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


        // Стили чата и писка посетителей
        chatStyle: function () {
            let style = {
                'height': this.mainElementHeight
            };

            // Для разрешения больше мобильного - фиксированная ширина
            if (!this.$vuetify.breakpoint.xs) {
                style['max-width'] = '350px';
            }

            // У видео приоритет на мобильнике
            if (this.$vuetify.breakpoint.xs && this.video.isVisible) {
                this.chat.isVisible = false;
            }

            return style;
        },

        visitorsStyle: function () {
            let style = {
                'height': this.mainElementHeight
            };

            // Для разрешения больше мобильного - фиксированная ширина
            if (!this.$vuetify.breakpoint.xs) {
                style['max-width'] = '350px';
            }

            // У чата приоритет над списком пользователей на маленьких разрешениях
            if (this.$vuetify.breakpoint.width < 1264 && this.chat.isVisible) {
                this.visitors.isVisible = false;
            }

            // У видео приоритет на мобильнике
            if (this.$vuetify.breakpoint.xs && this.video.isVisible) {
                this.visitors.isVisible = false;
            }

            return style;
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
        },


        // Методы управления чатом
        chatHideShow: function () {
            this.chat.isVisible = !this.chat.isVisible;

            // На маленьком рзрешении, если включается чат, выключаем список посетителей
            if (this.$vuetify.breakpoint.width < 1264 && this.chat.isVisible) {
                this.visitors.isVisible = false;
            }

            // Для мобильника, если включают чат, скрываем видео
            this.video.isVisible = !(this.$vuetify.breakpoint.xs && this.chat.isVisible);
        },


        // Методы управления посетителями
        visitorsHideShow: function () {
            this.visitors.isVisible = !this.visitors.isVisible;

            // На маленьком рзрешении, если включается список посетителей, выключаем чат
            if (this.$vuetify.breakpoint.width < 1264 && this.visitors.isVisible) {
                this.chat.isVisible = false;
            }

            // Для мобильника, если включают список посетителей, скрываем видео
            this.video.isVisible = !(this.$vuetify.breakpoint.xs && this.visitors.isVisible);
        },


        // Расчет высоты основных элементов
        calcMainElementHeight: function () {
            this.mainElementHeight = windowSize()[1] -
                document.getElementById('header').offsetHeight -
                document.getElementById('footer').offsetHeight + 'px';
        }
    }
};


function windowSize() {
    let w = window,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0],
        x = w.innerWidth || e.clientWidth || g.clientWidth,
        y = w.innerHeight || e.clientHeight || g.clientHeight;
    return [x, y];
}
