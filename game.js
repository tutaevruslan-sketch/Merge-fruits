const canvas_gameField = document.getElementById("canvas_gameField");
const ctx_gameField = canvas_gameField.getContext("2d");
const canvas_HUD = document.getElementById("canvas_HUD");
const ctx_HUD = canvas_HUD.getContext("2d");
const canvas_fruits = document.getElementById("canvas_fruits");
const ctx_fruits = canvas_fruits.getContext("2d");

let is_testing = true;
let is_paused = false; // стоит ли сейчас игра на паузе.

let gp; // переменная хранящая GamePush SDK.
let ysdk; // переменная хранящая Yandex SDK.

//let version = 803; // текущая версия игры. (нужна для того чтобы можно было при изменении билда игры настраивать игру для игроков так как захочешь, например всем обнулить счёт или ещё что-то)



let languages = {
    RU: 'ru',
    EN: 'en',
}

let language = languages.RU; // язык игрока.
//let language = languages.EN; // язык игрока.

let is_mobile = false; // на смартфоне ли играет игрок. Если true, то на смартфоне, если false - на компе.

let was_shown_pleloader_ads = false; // была ли уже показана Preload-реклама в самом начале игры.

let FullScreen_ads_delay = 120000; // (4 минуты) 240000. задержка между показами FullScreen-рекламы (чистое игровое время без учёта пауз).
let time_of_last_FullScreen_ads = 0; // время когда последний раз была закрыта FullScreen-реклама.
let count_stars_after_FullScreen_ads = 20; // количество звёдочек которые получает игрок после просмотра FullScreen-рекламы.

let player; // для Яндекса вся инфа о игроке.
let dataPlayer; // данные игрока скачанные из облака Яндекса.
let payments = null; // переменная хранящая покупки от Яндекса.

let is_playing_FullScreen_or_Rewarded = false; // запущена ли сейчас rewarded реклама.

let can_save_to_cloud = true; // можно ли сейчас сохранить настройки игры в облако (не чаще раз в 10 сек)
let can_save_to_cloud_delay = 12000; // 10000. можно сохранять в облако не чаще 10 секунд.

//let version = 16; // 16. версия игры. Если нужно будет очистить у игроков все очки и обнулить все результаты игры, нужно просто поменять версию игры.

// игровые платформы.
const platforms = {
    YANDEX_GAMES: 'yandex_games',
    GAME_PUSH: 'game_push',
}

let platform = platforms.YANDEX_GAMES;
//let platform = platforms.GAME_PUSH;


let browser_name = getBrowserName(navigator.userAgent) || '';


let world, mouseBody,
    topPlaneBody, bottomPlaneBody, leftPlaneBody, rightPlaneBody;


// игровое поле для фруктов.
let gameField = {
    width: 0, // ширина в пикселях.
    height: 0, // высота в пикселях.
    centerX: 0,
    centerY: 0,
    offset: 0, // смещение от края экрана.

    width_in_meters: 7, // ширина gameField в метрах, для физического движка.

    ratio_width_to_height_of_gameField: 0.6, // соотношение ширины gameField к его высоте.
    ratio_offset_to_height_of_gameField: 0.05, // соотношение смещения gameField от края экрана к его высоте.
    ratio_height_of_HUD_to_height_of_gameField: 0.2, // соотношение высоты HUD к высоте gameFeild.

    border: {
        line_width: 0.13, // толщина обводки.
        radius: 1, // радиус скругления углов gameField.
        color: '#ffffff', // цвет рамки.
        color_shadow: '#ffffff', // цвет внутренней и внешней тени у рамки.
        number_of_color: 2, // номер цвета у неоновой подсветки рамки.

        time_last: 0,
        min_delay: 10000,
        max_delay: 50000,
        delay_current: 1000,

        update: function () {
            if (performance.now() - this.time_last > this.delay_current) {
                this.time_last = performance.now();
                this.delay_current = get_random_integer(this.min_delay, this.max_delay);
                this.change_color();
                this.set_color();
            }
        },

        change_color: function () {
            let colors_count = 5;
            let random = 1;

            if (gameField.border.number_of_color === 1) { // розовый
                gameField.border.color_shadow = 'rgb(255, 0, 255)';
                gameField.border.color = 'rgb(255, 200, 255)';
            }
            if (gameField.border.number_of_color === 2) { // голубой
                gameField.border.color_shadow = 'rgb(0, 255, 255)';
                gameField.border.color = 'rgb(200, 255, 255)';
            }
            if (gameField.border.number_of_color === 3) { // зелёный
                gameField.border.color_shadow = 'rgb(0, 255, 0)';
                gameField.border.color = 'rgb(200, 255, 200)';
            }
            if (gameField.border.number_of_color === 4) { // жёлтый
                gameField.border.color_shadow = 'rgb(255, 255, 0)';
                gameField.border.color = 'rgb(255, 255, 200)';
            }
            if (gameField.border.number_of_color === 5) { // белый
                gameField.border.color_shadow = 'rgb(255, 255, 255)';
                gameField.border.color = 'rgb(255, 255, 255)';
            }


            do {
                random = get_random_integer(1, colors_count);
            } while (random === gameField.border.number_of_color);


            gameField.border.number_of_color = random;
        },

        set_color: function () {
            let scale_local = Math.min(gameField.width / window.devicePixelRatio, gameField.height / window.devicePixelRatio);

            let shadow_size = scale_local * 0.025 + 'px';
            let border_width = scale_local * 0.004 + 'px';

            let gameField_elem = document.getElementById('gameField');

            gameField_elem.style.boxShadow = '0px 0px ' + shadow_size + ' ' + gameField.border.color_shadow + ', inset 0px 0px ' + shadow_size + ' ' + gameField.border.color_shadow;
            gameField_elem.style.border = border_width + ' solid ' + gameField.border.color;

            // обрезаем видимую верхушку.
            let top = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField / window.devicePixelRatio;
            let right = gameField.width / window.devicePixelRatio * 1.3;
            let bottom = gameField.height / window.devicePixelRatio * 1.3;
            let left = -gameField.width / window.devicePixelRatio * 0.3;
            gameField_elem.style.clipPath = `rect(${top}px ${right}px ${bottom}px ${left}px)`;
        },
    },




};

let scale = 1; // сколько пикселей в 1 метре в физическом движке.
let scale_X = 1; // общий scale зависящий от ширины gameField, нужен для всего кроме того что рисуется в gameField.
let scale_Y = 1; // общий scale зависящий от ширины gameField, нужен для всего кроме того что рисуется в gameField.
//let scale_objects = 1; // scale чисто для отрисовки всех объектов в gameField, зависит от площади gameField.

let circleRadius = 1;

let image_fruits = new Image();
//image_fruits.src = 'images/fruits.png';
image_fruits.src = 'images/fruits.png';

let image_all = new Image();
image_all.src = 'images/all.png';

let image_gift = new Image();
image_gift.src = 'images/gift.png';

let image_magnet = new Image();
image_magnet.src = 'images/magnet.png';

let image_star = new Image();
image_star.src = 'images/star.png';



const fps = 60;

let last_time_last_second = 0;
let sum_of_fps = 0;
let counter_of_frames = 0;

let fixed_time_step = 1 / fps;
let max_sub_steps = 10;
let accumulator = 0;

let limit_frames = 5; // 5

let last_time = 0; // время начала предыдущего кадра для animation.



let scale_of_fps = 1; // множитель fps. Во сколько раз текущий fps отличается от 60. Нужно для корректировки скорости движения всего в игре.
let delta_time = 1; // сколько времени прошло между прошлым кадром и сейчас.
let animation_id = null; // id главной анимации.



let pointermove_time = 0; // для ограничения количества опросов на pointermove.


let time_pause = 0; // время ухода игры на паузу.
let downtime = 0; // время простоя, т.е. время между уходом на паузу и снятия игры с паузы.



// виды видеореклам.
const types_of_rewarded = {
    GAMEMODE_NORMAL: 'gamemode_normal',
    GAMEMODE_BOOST: 'gamemode_boost',
    GAMEMODE_GRAVITY: 'gamemode_gravity',
    STARS: 'stars',
}

let current_rewarded = types_of_rewarded.GAMEMODE_NORMAL;

let game_mode_boost_duration = 1800; // 180000
let game_mode_gravity_duration = 1200; // 120000
let game_mode_current_duration; // продолжительность выбранного сейчас режима игры.
let game_mode_time_start; // время активации выбранного game_mode.

let current_type_of_rewarded = types_of_rewarded.GAMEMODE_NORMAL; // какой rewarded выбрал игрок.


// список игровых элементов на поле. (фрукты, бомбочки, подарки и т.д.)
const game_objects = {
    FRUIT: 'fruit',
    GIFT: 'gift',
    MAGNET: 'magnet',
    STAR_BONUS: 'star_bonus',
    PLANE: 'plane', // стены gameField.
}


// Звуки.

let sound_clock_ticking = new Howl({
    src: ['sounds/clock_ticking.mp3'],
    volume: 0.07, // 0.075
});

let sound_push_fruit = new Howl({
    src: ['sounds/push_fruit.mp3'],
    volume: 0.1, // 0.075
});

let sound_merge = new Howl({
    src: ['sounds/merge.mp3'],
    volume: 1, // 0.55
});

let sound_add_score = new Howl({
    src: ['sounds/add_score.mp3'],
    volume: 0.2, // 0.6
});

let sound_open_new_fruit = new Howl({
    src: ['sounds/open_new_fruit.mp3'],
    volume: 0.3, // 0.2
});

let sound_on_off_game_mode = new Howl({
    src: ['sounds/on_off_game_mode.mp3'],
    volume: 0.6, // 0.3
});

let sound_click = new Howl({
    src: ['sounds/click.mp3'],
    volume: 0.2, // 0.1
});

let sound_bonus = new Howl({
    src: ['sounds/bonus.mp3'],
    volume: 0.23, // 0.15
});

let sound_purchase = new Howl({
    src: ['sounds/purchase.mp3'],
    volume: 0.3, // 0.15
});



let window_stars_offset_X; // смещение по оси X для сворачивания окошка со звёздами.
let window_stars_offset_Y; // смещение по оси Y для сворачивания окошка со звёздами.
let is_opened_window_stars = false; // открыто ли в данный момент окно звёздочек.

let id_setTimeout_close_window_stars;


let window_settings_offset_X; // смещение по оси X для сворачивания окошка настроек.
let window_settings_offset_Y; // смещение по оси Y для сворачивания окошка настроек.
let is_opened_window_settings = false; // открыто ли в данный момент окно настроек игры.





// разлетающиеся звёздочки при добавлении нового фрукта на поле.
let spray_of_stars_on_new_fruit = {
    items: [], // массив самих вспышек из звёздочек.
    stars_count: 50, // количество брызгов из звёздочек.

    step_move: 1, // шаг перемещения звёздочки на каждом кадре.
    step_downsizing: 1, // шаг уменьшения размера звёздочки на каждом кадре.

    min_size_of_star: 1,
    max_size_of_star: 1,

    min_offset_from_center: 1,
    max_offset_from_center: 1,

    min_angle_of_twist: 1, // min угол закручивания звёздочки в полёте.
    max_angle_of_twist: 1, // max угол закручивания звёздочки в полёте.

    min_opacity: 1,
    max_opacity: 1,


    set_settings: function () {

        let radius = fruits[0].radius;

        this.step_move = 0.01 * radius;
        this.step_downsizing = 0.003 * radius;

        this.min_size_of_star = 0.15 * radius;
        this.max_size_of_star = 0.3 * radius;

        this.min_offset_from_center = 0 * radius;
        this.max_offset_from_center = 1.5 * radius;

        this.min_angle_of_twist = 0.003;
        this.max_angle_of_twist = 0.01;

        this.min_opacity = 0.1;
        this.max_opacity = 0.9;
    },

    add: function (id_body) {
        let x = world.getBodyById(id_body).position[0];
        let y = world.getBodyById(id_body).position[1];

        this.items.push({
            stars: [], // звёздочки брызгов.
            position_X: x,
            position_Y: y,
        });

        let last_id = this.items.length - 1;

        // устанавливаем настройки для каждой звёздочки.
        for (let i = 0; i < this.stars_count; i++) {

            let angle_of_direction = get_random_float(0, Math.PI * 2);
            let offset_from_center_in_start = get_random_float(this.min_offset_from_center, this.max_offset_from_center);
            let position = get_coords_of_end_of_distance(
                this.items[last_id].position_X,
                this.items[last_id].position_Y,
                angle_of_direction,
                offset_from_center_in_start,
            );

            // рандомное направление закрутки звёздочки. (влево или вправо)
            let is_left_direction_of_twist = get_random_integer(1, 2);
            if (is_left_direction_of_twist === 1) is_left_direction_of_twist = true;
            else is_left_direction_of_twist = false;

            this.items[last_id].stars.push({
                angle_of_direction: angle_of_direction, // направление движения звёздочки.
                size_of_star: get_random_float(this.min_size_of_star, this.max_size_of_star),
                offset_from_center_in_start: offset_from_center_in_start,

                step_of_angle_of_twist: get_random_float(this.min_angle_of_twist, this.max_angle_of_twist),
                current_angle_of_twist: 0, // текущий угол закрутки звёздочки.
                is_left_direction_of_twist: is_left_direction_of_twist,

                opacity: get_random_float(this.min_opacity, this.max_opacity),

                position_X: position[0],
                position_Y: position[1],
            });
        }
    },

    update: function () {
        for (let i = 0; i < this.items.length; i++) {
            for (let j = 0; j < this.items[i].stars.length; j++) {

                let position = get_coords_of_end_of_distance(
                    this.items[i].stars[j].position_X,
                    this.items[i].stars[j].position_Y,
                    this.items[i].stars[j].angle_of_direction,
                    this.step_move / scale_of_fps
                );
                this.items[i].stars[j].position_X = position[0];
                this.items[i].stars[j].position_Y = position[1];


                // делаем закрутку звёздочки.
                if (this.items[i].stars[j].is_left_direction_of_twist) {
                    this.items[i].stars[j].current_angle_of_twist += this.items[i].stars[j].step_of_angle_of_twist;
                } else {
                    this.items[i].stars[j].current_angle_of_twist -= this.items[i].stars[j].step_of_angle_of_twist;
                }

                if (this.items[i].stars[j].size_of_star - this.step_downsizing / scale_of_fps > 0) {
                    this.items[i].stars[j].size_of_star -= this.step_downsizing / scale_of_fps;
                } else {
                    this.items[i].stars.splice(j, 1);
                    j--;
                    // если все звёздочки удалены, то удаляем сам спрей из массива спреев.
                    if (this.items[i].stars.length === 0) {
                        this.items.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }
        }

        this.draw();
    },

    draw: function () {
        for (let i = 0; i < this.items.length; i++) {
            for (let j = 0; j < this.items[i].stars.length; j++) {

                ctx_fruits.save();
                ctx_fruits.translate(
                    this.items[i].stars[j].position_X,
                    this.items[i].stars[j].position_Y
                );
                ctx_fruits.rotate(this.items[i].stars[j].current_angle_of_twist);

                let color = 'rgba(255, 245, 0, ' + this.items[i].stars[j].opacity + ')';

                // Рисуем 5-лучевую звезду.
                this.drawStar(
                    0,
                    0,
                    5,
                    this.items[i].stars[j].size_of_star * 2,
                    this.items[i].stars[j].size_of_star,
                    color,
                );

                ctx_fruits.restore();
            }
        }
    },

    drawStar: function (x, y, spikes, outerRadius, innerRadius, color) {
        let rot = (Math.PI / 2) * 3; // Начальный угол
        const step = Math.PI / spikes; // Шаг между вершинами

        ctx_fruits.beginPath();
        ctx_fruits.moveTo(x, y - outerRadius); // Перемещаемся к верхней вершине

        for (let i = 0; i < spikes; i++) {
            ctx_fruits.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
            rot += step;

            ctx_fruits.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx_fruits.lineTo(x, y - outerRadius); // Закрываем путь
        ctx_fruits.closePath();
        ctx_fruits.fillStyle = color; // Цвет заливки
        ctx_fruits.fill();
    },
}




// граница переполнености стакана фруктами, если переполнено, то включается таймер, после которого игра проиграна.
let red_line = {
    delay_before_timer: 3000, // сколько времени подряд фрукты должны пересекать красную линию, чтобы включился таймер отсчёта до GAME OVER.
    count_frames_before_timer: 0, // сколько кадров подряд фрукты должны пересекать красную линию, чтобы включился таймер отсчёта до GAME OVER.
    frames_counter: 0, // счётчик кадров который считает сколько уже кадров подряд фрукты пересекают красную линию.
    is_started_timer: false, // запущен ли сейчас таймер.

    time: 0,
    duration_in_seconds: 35, // 45
    counter_seconds: 0, // счётчик секунд, сколько осталось до GAME OVER.

    get_text: function (value) {
        let text;

        if (language === languages.RU) text = `Переполнено! Вы проиграете через ${value}`;
        else text = `Overcrowded! You will lose in ${value}`;

        return text;
    },

    game_over: function () { // обнуляем текущий результат и удаляем все фрукты с поля. Игра начинается заново.
        this.stop_timer();

        scores.value_current = 0;
        scores.refresh();

        // удаляем все фрукты с поля.
        if (fruits.length > 0) {
            for (let i = 0; i < fruits_count; i++) {
                for (let j = fruits[i].items.length - 1; j >= 0; j--) {
                    delete_body_fruit(fruits[i].items[j].body);
                }
            }
        }
    },

    // обновляет размеры и расположение надписи предупреждения и красного поля мигающего.
    refresh: function () {
        if (this.is_started_timer) {

            // Текст.
            let red_line_container = document.getElementById('red_line_container');

            red_line_container.style.fontSize = gameField.width * 0.045 / window.devicePixelRatio + 'px';

            let HUD_height = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField;
            let top = HUD_height * 0.65 / window.devicePixelRatio;

            red_line_container.style.top = top + 'px';


            // Мигающее красное поле.
            let red_field = document.getElementById('red_field');
            red_field.style.width = gameField.width / window.devicePixelRatio + 'px';
            red_field.style.height = gameField.height / window.devicePixelRatio + 'px';
            let offset_Y = (canvas_fruits.height / 2 - gameField.centerY) / window.devicePixelRatio;
            red_field.style.marginBottom = offset_Y * 2 + 'px';
            red_field.style.borderRadius = gameField.border.radius / window.devicePixelRatio + 'px';

            // обрезаем видимую верхушку.
            top = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField / window.devicePixelRatio;
            let right = gameField.width / window.devicePixelRatio * 1.3;
            let bottom = gameField.height / window.devicePixelRatio * 1.3;
            let left = -gameField.width / window.devicePixelRatio * 0.3;
            red_field.style.clipPath = `rect(${top}px ${right}px ${bottom}px ${left}px)`;
        }
    },

    start_timer: function () {

        sound_clock_ticking.loop(true);
        sound_clock_ticking.play();

        this.time = performance.now();
        this.counter_seconds = this.duration_in_seconds;

        this.is_started_timer = true;

        let text_value = this.get_text(this.duration_in_seconds);

        let container = document.createElement('div');
        document.body.append(container);
        container.className = 'red_line_container';
        container.id = 'red_line_container';
        container.style.fontSize = gameField.width * 0.045 / window.devicePixelRatio + 'px';

        let HUD_height = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField;
        let top = HUD_height * 0.65 / window.devicePixelRatio;

        container.style.top = top + 'px';

        let text_shadow = document.createElement('div');
        container.append(text_shadow);
        text_shadow.innerText = text_value;
        text_shadow.className = 'red_line_text_shadow';
        text_shadow.id = 'red_line_text_shadow';

        let text = document.createElement('div');
        container.append(text);
        text.innerText = text_value;
        text.className = 'red_line_text';
        text.id = 'red_line_text';


        // рисуем красное мигающее поле поверх gameField.
        let red_field = document.createElement('div');
        document.body.append(red_field);
        red_field.style.width = gameField.width / window.devicePixelRatio + 'px';
        red_field.style.height = gameField.height / window.devicePixelRatio + 'px';
        red_field.className = 'red_field';
        red_field.id = 'red_field';
        let offset_Y = (canvas_fruits.height / 2 - gameField.centerY) / window.devicePixelRatio;
        red_field.style.marginBottom = offset_Y * 2 + 'px';
        red_field.style.borderRadius = gameField.border.radius / window.devicePixelRatio + 'px';


        // обрезаем видимую верхушку.
        top = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField / window.devicePixelRatio;
        let right = gameField.width / window.devicePixelRatio * 1.3;
        let bottom = gameField.height / window.devicePixelRatio * 1.3;
        let left = -gameField.width / window.devicePixelRatio * 0.3;
        red_field.style.clipPath = `rect(${top}px ${right}px ${bottom}px ${left}px)`;
    },

    stop_timer: function () {
        this.is_started_timer = false;
        sound_clock_ticking.stop();
        document.getElementById('red_line_container').remove();
        document.getElementById('red_field').remove();
    },

    update: function () {
        let current_fps = scale_of_fps * fps;
        red_line.count_frames_before_timer = this.delay_before_timer / 1000 * current_fps;

        // находим на какой высоте по Y находится красная линия.
        let HUD_height = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField;
        let position = get_physicCoords_from_canvasCoords(0, HUD_height);
        let red_line_Y = position[1];


        // проверяем пересёк ли красную линию хотя бы один фрукт.
        let is_crossed_red_line = false;

        loop:
        for (let i = 0; i < fruits_count; i++) {
            let radius = fruits[i].radius;
            for (let j = 0; j < fruits[i].items.length; j++) {
                // если фрукт пересек красную линию.
                if (fruits[i].items[j].body.position[1] + radius > red_line_Y) {
                    is_crossed_red_line = true;
                    break loop; // останавливаем поиск в обоих циклах.
                }
            }
        }

        if (is_crossed_red_line) { // если хотя бы один фрукт пересекает красную линию.

            if (!this.is_started_timer) {
                if (this.frames_counter + 1 > this.count_frames_before_timer) {
                    // включаем на экране таймер отсчёта сколько времени осталось до GAME OVER если не убрать фрукты с красной линии.
                    this.start_timer();
                    this.frames_counter = 0;
                } else {
                    this.frames_counter++;
                }
            } else {
                if (performance.now() > this.time + 1000) {
                    this.counter_seconds--;
                    this.time = performance.now();
                    save_settings_to_localStorage();

                    let text = this.get_text(this.counter_seconds);

                    document.getElementById('red_line_text_shadow').innerText = text;
                    document.getElementById('red_line_text').innerText = text;
                }

                if (this.counter_seconds === 0) {
                    this.game_over();
                }
            }

        } else { // если ни один фрукт не пересекает красную линию.
            this.frames_counter = 0;
            // останавливаем таймер.
            if (this.is_started_timer) this.stop_timer();
        }
    },
}






// всплывающие очки сколько добавилось очков и сколько добавилось или отнялось звёздочек, а также анимация.
let popup_points = {
    duration: 1800,
    // анимация увеличения или уменьшения счётчика звёздочек или очков.
    animation: {
        duraton: 500, // продолжительность анимации увеличения или уменьшения счётчика очков или звёздочек.
        steps_count: 4, // число шагов в анимации.
        step_duraton: 0, // продолжительность одного шага.
    },

    items_stars: [], // массив звёздочек, которые надо будет прибавить или отнять от общего счётчика.
    items_scores: [], // массив очков, которые надо будет прибавить или отнять от общего счётчика.

    init: function () {
        this.animation.step_duraton = this.animation.duraton / this.animation.steps_count;
    },

    // добавляет новый элемент в массив.
    add_item: function (is_stars, is_add, value, position_X, position_Y) { // value - число очков или звёздочек, которые надо прибавить или отнять.

        let text;
        if (is_add) text = '+' + value;
        else text = '-' + value;

        let position = get_canvasCoords_from_physicCoords(position_X, position_Y);

        if (is_stars) { // если звёздочки.

            // создаём всплывающие очки на экране.
            let points_stars_container = document.createElement('div');
            document.body.append(points_stars_container);
            points_stars_container.style.left = position[0] / window.devicePixelRatio + 'px';
            points_stars_container.style.top = position[1] / window.devicePixelRatio + 'px';
            points_stars_container.className = 'points_stars_container';
            points_stars_container.style.fontSize = gameField.width * 0.06 / window.devicePixelRatio + 'px';

            let points_stars_value_container = document.createElement('div');
            points_stars_container.append(points_stars_value_container);
            points_stars_value_container.className = 'points_stars_value_container';

            let points_stars_value_shadow = document.createElement('div');
            points_stars_value_container.append(points_stars_value_shadow);
            points_stars_value_shadow.className = 'points_stars_value_shadow';
            points_stars_value_shadow.innerText = text;

            let points_stars_value = document.createElement('div');
            points_stars_value_container.append(points_stars_value);
            points_stars_value.className = 'points_stars_value';
            points_stars_value.innerText = text;

            let points_star_image = document.createElement('img');
            points_stars_container.append(points_star_image);
            points_star_image.className = 'points_star_image';
            points_star_image.src = 'images/star.png';
            points_star_image.draggable = false;

            points_stars_container.animate(
                [
                    { transform: 'translate(-50%, 50%)', opacity: 1, offset: 0 },
                    { opacity: 1, offset: 0.5 },
                    { transform: 'translate(-50%, -250%)', opacity: 0, offset: 1 },
                ],
                {
                    fill: 'forwards',
                    duration: this.duration,
                },
            );

            setTimeout(() => {
                points_stars_container.remove();
            }, this.duration);




            // раздуваем счётчик звёздочек когда он увеличивается.
            let star_counter_container = document.getElementById('star_counter_container');
            fast_scale_of_counter(star_counter_container);

        } else { // если очки.

            let points_score_container = document.createElement('div');
            document.body.append(points_score_container);
            points_score_container.className = 'points_score_container';
            points_score_container.style.fontSize = gameField.width * 0.07 / window.devicePixelRatio + 'px';
            points_score_container.style.left = position[0] / window.devicePixelRatio + 'px';
            points_score_container.style.top = position[1] / window.devicePixelRatio + 'px';

            let points_score_shadow = document.createElement('div');
            points_score_container.append(points_score_shadow);
            points_score_shadow.className = 'points_score_shadow';
            points_score_shadow.innerText = text;

            let points_score = document.createElement('div');
            points_score_container.append(points_score);
            points_score.className = 'points_score';
            points_score.innerText = text;

            points_score_container.animate(
                [
                    /* { transform: 'translate(-50%, -50%)' },
                    { transform: 'translate(-50%, -300%)' }, */
                    { transform: 'translate(-50%, -50%)', opacity: 1, offset: 0 },
                    { opacity: 1, offset: 0.5 },
                    { transform: 'translate(-50%, -350%)', opacity: 0, offset: 1 },
                ],
                {
                    fill: 'forwards',
                    duration: this.duration,
                },
            );

            setTimeout(() => {
                points_score_container.remove();
            }, this.duration);



            // раздуваем счётчик очков когда он увеличивается.
            let score_container = document.getElementById('score_current_container');
            fast_scale_of_counter(score_container);
        }

        // закончили со всплывающими очками.




        // создаём визуальное плавное увеличение счётчика в несколько шагов чисто для красоты.
        let target_value = 0;

        if (is_stars) { // если это счётчик звёздочек.
            if (popup_points.items_stars.length > 0) {
                let id_last = popup_points.items_stars.length - 1;
                target_value = popup_points.items_stars[id_last].target_value;
            } else {
                target_value = Math.floor(stars.value);
            }
        } else { // если это счётчик очков.
            if (popup_points.items_scores.length > 0) {
                let id_last = popup_points.items_scores.length - 1;
                target_value = popup_points.items_scores[id_last].target_value;
            } else {
                target_value = Math.floor(scores.value_current);
            }
        }

        if (is_add) target_value += value;
        else target_value -= value;

        let step = value / popup_points.animation.steps_count * 1.001; // умножаем на 1.0001 чтобы число было совсем чуток больше, это для того чтобы в последнем прибавлении полученное число немного но перевешивало target_value, чтобы не было резкого изменения в конце.

        if (is_stars) {
            popup_points.items_stars.push({
                is_stars: is_stars, // если true - значит это звёздочки, если false - значит просто очки.
                is_add: is_add, // если true - значит добавляет очки или звёздочки, если false - значит отнимает.
                target_value: target_value, // сколько очков или звёздочек должно быть в итоге в счётчике после прибавления или отнимания.
                step: step, // на какое число прибавлять или отнимать счётчик на каждом шаге.
                time: performance.now(),
            });
        } else {
            popup_points.items_scores.push({
                is_stars: is_stars, // если true - значит это звёздочки, если false - значит просто очки.
                is_add: is_add, // если true - значит добавляет очки или звёздочки, если false - значит отнимает.
                target_value: target_value, // сколько очков или звёздочек должно быть в итоге в счётчике после прибавления или отнимания.
                step: step, // на какое число прибавлять или отнимать счётчик на каждом шаге.
                time: performance.now(),
            });
        }
    },

    update: function () {
        if (this.items_stars.length > 0) {
            if (this.items_stars[0].time + this.animation.step_duraton < performance.now()) {

                this.items_stars[0].time = performance.now();

                let step = this.items_stars[0].step;

                if (!this.items_stars[0].is_add) step *= -1;

                stars.value += step;

                if (stars.value > this.items_stars[0].target_value) {
                    stars.value = this.items_stars[0].target_value;
                    this.items_stars.splice(0, 1);

                    save_settings();
                }

                stars.refresh();
            }
        }

        if (this.items_scores.length > 0) {
            if (performance.now() > this.items_scores[0].time + this.animation.step_duraton) {

                this.items_scores[0].time = performance.now();

                let step = this.items_scores[0].step;

                if (!this.items_scores[0].is_add) step *= -1;

                scores.value_current += step;

                if (scores.value_current > this.items_scores[0].target_value) {
                    scores.value_current = this.items_scores[0].target_value;
                    this.items_scores.splice(0, 1);

                    save_settings();
                }

                if (scores.value_current > scores.value_best) scores.value_best = scores.value_current;

                scores.refresh();
            }
        }
    }
}





// звёздочки.
let stars = {
    value: 32, // 32 значение счётчика звёзд. Общее количество звёзд, которое сейчас есть у игрока.
    items: [], //массив вылетающих звёздочек после мерджа или если подобрать звёздочку с цифрой.

    // обновляет значения на экране.
    refresh: function () {
        document.getElementById('star_counter_value_shadow').innerText = Math.floor(stars.value);
        document.getElementById('star_counter_value').innerText = Math.floor(stars.value);
    },

    button_delete_fruit: {
        price: 25, // 125 цена в звёздочках за удаление с поля любого фрукта.
        is_pressed: false, // нажата ли сейчас кнопка.
        selected_fruit_id: 0, // id фрукта который я выбрал для удаления.
        selected_item_id: 0, // id items из фруктов который я выбрал для удаления.
        is_selected_fruit: false, // выбран ли сейчас фрукт для удаления, т.е. находится ли мышка на фрукте.

        refresh: function () {
            if (stars.button_delete_fruit.is_pressed) {
                let container = document.getElementById('HUD_button_delete_container');
                container.style.fontSize = gameField.width * 0.12 / window.devicePixelRatio + 'px';
            }

            document.getElementById('star_button_delete_value_shadow').innerText = stars.button_delete_fruit.price;
            document.getElementById('star_button_delete_value').innerText = stars.button_delete_fruit.price;
        },

        init: function () {
            document.getElementById('star_button_delete_container').addEventListener('click', (event) => {

                sound_click.play();

                this.is_pressed = true;
                document.getElementById('HUD').style.visibility = 'hidden';

                let container = document.createElement('div');
                document.body.append(container);
                container.className = 'HUD_button_delete_container';
                container.id = 'HUD_button_delete_container';
                container.style.fontSize = gameField.width * 0.12 / window.devicePixelRatio + 'px';

                let button = document.createElement('button');
                container.append(button);
                button.className = 'HUD_button_delete_button';

                let text_value;
                if (language === languages.RU) text_value = 'Назад';
                else text_value = 'Back';

                button.innerText = text_value;

                if (language === languages.RU) text_value = 'Выбери фрукт, который хочешь удалить.';
                else text_value = 'Select the fruit you want to remove.';

                let text_container = document.createElement('div');
                container.append(text_container);
                text_container.className = 'HUD_button_delete_text_container';

                let text_shadow = document.createElement('div');
                text_container.append(text_shadow);
                text_shadow.className = 'HUD_button_delete_text_shadow';
                text_shadow.innerText = text_value;

                let text = document.createElement('div');
                text_container.append(text);
                text.className = 'HUD_button_delete_text';
                text.innerText = text_value;



                button.addEventListener('click', (event) => {
                    sound_click.play();
                    document.getElementById('HUD').style.visibility = 'visible';
                    container.remove();
                    stars.button_delete_fruit.is_pressed = false;
                });
            });
        },


        // сообщение о том, что недостаточно звёздочек для удаления фрукта.
        popup_message: function (x, y) {

            fast_scale_of_counter(document.getElementById('star_button_delete_container'));

            let text;
            if (language === languages.RU) text = 'Недостаточно';
            else text = 'Not enough';

            let position = get_canvasCoords_from_physicCoords(x, y);

            let stars_message_container = document.createElement('div');
            document.body.append(stars_message_container);
            stars_message_container.style.left = position[0] + 'px';
            stars_message_container.style.top = position[1] + 'px';
            stars_message_container.style.fontSize = gameField.width * 0.05 + 'px';
            stars_message_container.className = 'stars_message_container';

            let stars_message_text_container = document.createElement('div');
            stars_message_container.append(stars_message_text_container);
            stars_message_text_container.className = 'stars_message_text_container';

            let stars_message_text_shadow = document.createElement('div');
            stars_message_text_container.append(stars_message_text_shadow);
            stars_message_text_shadow.className = 'stars_message_text_shadow';
            stars_message_text_shadow.innerText = text;

            let stars_message_text = document.createElement('div');
            stars_message_text_container.append(stars_message_text);
            stars_message_text.className = 'stars_message_text';
            stars_message_text.innerText = text;

            let stars_message_image = document.createElement('img');
            stars_message_container.append(stars_message_image);
            stars_message_image.src = 'images/star.png';
            stars_message_image.className = 'stars_message_image';

            let duration = 2000;

            stars_message_container.animate(
                [
                    { transform: 'translate(-50%, -50%)' },
                    { transform: 'translate(-50%, -300%)' },
                ],
                {
                    fill: 'forwards',
                    duration: duration,
                },
            );

            setTimeout(() => {
                stars_message_container.remove();
            }, duration);
        },


        // проверяем, не выбрали ли фрукт мышкой, если да, то подсвечиваем его визуально.
        update: function (x, y) {
            if (!this.is_pressed) return;

            let position = get_physicCoords_from_canvasCoords(x, y);

            x = position[0];
            y = position[1];

            for (let i = 0; i < fruits_count; i++) {
                let radius = fruits[i].radius;

                for (let j = 0; j < fruits[i].items.length; j++) {
                    let distance = get_distance_between_2_points(
                        fruits[i].items[j].body.position[0],
                        fruits[i].items[j].body.position[1],
                        x,
                        y
                    );

                    if (distance < radius) {
                        stars.button_delete_fruit.selected_fruit_id = i;
                        stars.button_delete_fruit.selected_item_id = j;
                        stars.button_delete_fruit.is_selected_fruit = true;
                        return;
                    }
                }
            }

            this.is_selected_fruit = false;
        },
    },

    count_merges_for_star: 3, // каждые сколько мерджей будет выпадать звёздочка.
    counter_merges: 0, // счётчик мерджей до получения звёздочки.

    position_X: 0,
    position_Y: 0,

    angle_1_phase: Math.PI / 20, // угол направления полёта очков в первой фазе.
    distance_1_phase_relative_sizeFirstFruit: 3, // дистанция первой фазы относительно размера первого фрукта.
    distance_1_phase: 3,
    step_of_angle_1_phase: 0.023, // шаг в радианах для вычисления шага затухания в sin или cos.

    sizeOfStar_relative_sizeFirstFruit: 1.2, // размер звёздочки относительно размера первого фрукта.
    sizeOfStar_1_phase: 1, // размер звёздочки в первой фазе.
    sizeOfStar_2_phase: 1, // размер звёздочки во второй фазе. (сделаем равной размеру звёздочки в счётчике звёздочек)

    duration_of_fly: 1200, // продолжительность полёта звёздочки к счётчику звёзд во второй фазе.

    angle_of_rotate_every_radiusFirstFruit: 0.3, // угол закрутки звёздочки на каждую длину радиуса первого фрукта.

    rewarded_value: 85, // сколько звёздочек даёт просмотр видеорекламы.

    in_app_1_id: '', // STARS_1000
    in_app_1_price: 0, // сколько янов будет стоить 1-ый инап.
    in_app_1_value: 1000, // сколько звёздочек будет давать покупка 1-го инапа.
    in_app_2_id: '', // STARS_3000
    in_app_2_price: 0, // сколько янов будет стоить 2-ой инап.
    in_app_2_value: 3000, // сколько звёздочек будет давать покупка 2-го инапа.
    in_app_3_id: '', // STARS_9000
    in_app_3_price: 0, // сколько янов будет стоить 3-ий инап.
    in_app_3_value: 9000, // сколько звёздочек будет давать покупка 3-го инапа.

    current_in_app_purchaseToken: '', // purchaseToken покупки которую сейчас обрабатываем в консуммировании.
    current_in_app_value_of_stars: 0, // количество звёздочек в текущей обрабатываемой покупке.

    price_currency_code: '', // код валюты. (руб, usd, euro)

    delay_between_purchases: 2000, // задержка между обработками покупок.

    purchases: [], // будет хранить массив совершённых покупок.


    init: function () {

        let size_of_star = document.getElementById('star_counter_image').getBoundingClientRect().width * window.devicePixelRatio;

        let width_of_star_wrapper = document.getElementById('star_counter_container').getBoundingClientRect().width;
        let height_of_star_wrapper = document.getElementById('star_counter_container').getBoundingClientRect().height;

        let star_wrapper_left = document.getElementById('star_counter_container').getBoundingClientRect().left;
        let star_wrapper_top = document.getElementById('star_counter_container').getBoundingClientRect().top;

        this.distance_1_phase = this.distance_1_phase_relative_sizeFirstFruit * fruits[0].radius;
        this.sizeOfStar_1_phase = this.sizeOfStar_relative_sizeFirstFruit * fruits[0].radius;
        this.sizeOfStar_2_phase = size_of_star / scale_X;

        let position = get_physicCoords_from_canvasCoords(
            (star_wrapper_left + width_of_star_wrapper / 2) * window.devicePixelRatio,
            (star_wrapper_top + height_of_star_wrapper / 2) * window.devicePixelRatio,
        );

        this.position_X = position[0];
        this.position_Y = position[1];

        document.getElementById('star_button_delete_value_shadow').innerText = this.button_delete_fruit.price;
        document.getElementById('star_button_delete_value').innerText = this.button_delete_fruit.price;
    },

    // добавляет в счётчик звёздочек новое значение.
    add_value_to_starsCounter: function (value) {

        this.refresh();

        document.getElementById('star_counter_container').classList.add('stars_counter_scale');
        setTimeout(() => {
            document.getElementById('star_counter_container').classList.remove('stars_counter_scale');
        }, 150);


        // делаем popup добавленной звёздочки (+числоЗвёздочек) над счётчиком звёздочек.
        let width = document.getElementById('star_counter_value').getBoundingClientRect().width;
        let height = document.getElementById('star_counter_value').getBoundingClientRect().height;
        let left = document.getElementById('star_counter_value').getBoundingClientRect().left;
        let top = document.getElementById('star_counter_value').getBoundingClientRect().top;

        let center_X = left + width / 2;
        let center_Y = top + height / 2;

        add_new_popup_points(
            center_X,
            center_Y,
            true,
            value
        );
        // закончили popup.


        /* setTimeout(() => {
            sound_add_score.play();
        }, 50); */
    },

    add_new_item: function (position_X, position_Y) {

        let step_of_angle_1_phase = this.step_of_angle_1_phase / scale_of_fps;

        this.items.push({
            value: 1,
            is_phase_1: true,
            position_X: position_X,
            position_Y: position_Y,

            angle_direction_2_phase: 0, // угол направления полёта звёздочки к счётчику звёздочек.
            distance_2_phase: 1,

            current_angle_1_phase: 0,
            step_of_angle_1_phase: step_of_angle_1_phase,

            current_angle_2_phase: 0,
            step_of_angle_2_phase: 0,

            size: this.sizeOfStar_1_phase,
            angle_of_rotate: 0, // суммарный угол закрутки звёздочки во второй фазе.
            current_angle_of_rotate: 0,
        });
    },

    animation_move_to_stars_counter: function () {
        for (let i = 0; i < this.items.length; i++) {

            let position, current_distance;
            let progress; // 0-1

            if (this.items[i].is_phase_1) { // 1 фаза.

                if (this.items[i].current_angle_1_phase + this.items[i].step_of_angle_1_phase > Math.PI / 2) {
                    this.items[i].current_angle_1_phase = Math.PI / 2;
                    this.items[i].is_phase_1 = false;
                } else this.items[i].current_angle_1_phase += this.items[i].step_of_angle_1_phase;

                progress = Math.sin(this.items[i].current_angle_1_phase);
                current_distance = progress * this.distance_1_phase;
                position = get_coords_of_end_of_distance(
                    this.items[i].position_X,
                    this.items[i].position_Y,
                    this.angle_1_phase,
                    current_distance,
                );

                if (!this.items[i].is_phase_1) {
                    this.items[i].position_X = position[0];
                    this.items[i].position_Y = position[1];

                    this.items[i].distance_2_phase = get_distance_between_2_points(
                        this.items[i].position_X,
                        this.items[i].position_Y,
                        this.position_X,
                        this.position_Y,
                    );

                    this.items[i].angle_direction_2_phase = get_angle_between_2_points(
                        this.items[i].position_X,
                        this.items[i].position_Y,
                        this.position_X,
                        this.position_Y,
                    );

                    let count_steps_of_angle = fps * scale_of_fps * (this.duration_of_fly / 1000);

                    this.items[i].step_of_angle_2_phase = (Math.PI / 2) / count_steps_of_angle;

                    this.items[i].angle_of_rotate = this.items[i].distance_2_phase / fruits[0].radius * this.angle_of_rotate_every_radiusFirstFruit;
                }

            } else { // 2 фаза.

                if (this.items[i].current_angle_2_phase + this.items[i].step_of_angle_2_phase > Math.PI / 2) {
                    this.items[i].current_angle_2_phase = Math.PI / 2;
                    this.items.splice(i, 1);

                    this.value++;

                    this.add_value_to_starsCounter(1);

                    continue;
                } else this.items[i].current_angle_2_phase += this.items[i].step_of_angle_2_phase;

                progress = 1 - Math.cos(this.items[i].current_angle_2_phase);


                this.items[i].size = this.sizeOfStar_1_phase - (this.sizeOfStar_1_phase - this.sizeOfStar_2_phase) * progress;

                this.items[i].current_angle_of_rotate = this.items[i].angle_of_rotate * progress;

                current_distance = this.items[i].distance_2_phase * progress;
                position = get_coords_of_end_of_distance(
                    this.items[i].position_X,
                    this.items[i].position_Y,
                    this.items[i].angle_direction_2_phase,
                    current_distance,
                );
            }


            // рисуем звёздочку.
            ctx_fruits.save();
            ctx_fruits.translate(position[0], position[1]);
            ctx_fruits.rotate(this.items[i].current_angle_of_rotate);
            ctx_fruits.scale(1, -1);

            ctx_fruits.drawImage(
                image_star,
                -this.items[i].size / 2,
                -this.items[i].size / 2,
                this.items[i].size,
                this.items[i].size,
            );

            ctx_fruits.scale(1, -1);
            ctx_fruits.restore();
        }
    },
}




// настройки звука.
let sounds = {
    is_mute: false, // выключены ли звуки в игре.
    volume: 0.5,

    refresh: function () {
        Howler.volume(this.volume); // устанавливаем глобальную громкость у Howler.

        if (this.is_mute) Howler.mute(true);
        else Howler.mute(false);

        let sounds_icon = document.getElementById('window_settings_sounds_img');
        if (!this.is_mute) {
            sounds_icon.style.objectPosition = 'left';
        } else {
            sounds_icon.style.objectPosition = '33.3%';
        }

        let window_settings_sounds_container_range = document.getElementById('window_settings_sounds_container_range');
        window_settings_sounds_container_range.value = this.volume * 100;

    },

    set_events: function () {
        let sounds_icon = document.getElementById('window_settings_sounds_img');
        sounds_icon.addEventListener('click', () => {
            if (this.is_mute) {
                sounds_icon.style.objectPosition = 'left';
                /* sounds_icon.src = 'images/sounds_on.png'; */
                Howler.mute(false);
                sound_click.play();
            } else {
                sounds_icon.style.objectPosition = '33.3%';
                /* sounds_icon.src = 'images/sounds_off.png'; */
                Howler.mute(true);
            }
            this.is_mute = !this.is_mute;
        });

        let window_settings_sounds_container_range = document.getElementById('window_settings_sounds_container_range');
        window_settings_sounds_container_range.oninput = function () {
            sounds.volume = window_settings_sounds_container_range.value / 100;
            Howler.volume(sounds.volume); // устанавливаем глобальную громкость у Howler.
        };
    },
}


let purchased_fruits = []; // массив купленных фруктов за звёздочки.


let fruits_start = []; // хранит в себе массив из 15 чисел. Каждое число это количество одного и того же фрукта на карте.

let fruits = [];

class Fruit {
    items = [];
    radius;
    mass;
    image_scale;
    image_offset_x;
    image_offset_y;
    score_value; // сколько очков добавится к общему счёту, если объединятся 2 этих фрукта.

    merge_color_1 = {
        color: 1,
        proportion: 1,
    }; // цвет_1 шариков при мердже.
    merge_color_2 = {
        color: 1,
        proportion: 1,
    }; // цвет_2 шариков при мердже.
    merge_color_3 = {
        color: 1,
        proportion: 1,
    }; // цвет_3 шариков при мердже.
}

const fruits_count = 15;
const first_fruit_radius = 0.08; // 0.08
const step_of_radius_by_first_fruit = 0.08; // шаг радиусов фруктов относительно первого фрукта. (от 0 до 1) т.е. в процентном соотношении.
let angularVelocity_min = -2;
let angularVelocity_max = 2;




// указатель указывающий в каком месте будет падать фрукт.
let pointer = {
    x: 1,
    y: 1,
    is_pressed: false, // зажата ли сейчас ЛКМ или держит пальцем ТАП на экране смартфона.

    fruit: {
        is_can_drop: true, // готов ли уже фрукт упасть, или ещё респавнится.
        respawn_duration: 1200, // 1200, продолжительность респавна фрукта прежде чем он может упасть. (сколько времени он растёт с нуля)
        current_id: 0, // id текущего фрукта который будет падать.
        max_id: 3, // id максимального фрукта который будет респавнится для падения.
        step_of_radius: 0,
        current_radius: 1,
        angle: 1,

        // создаём новый фрукт и сбрасываем его вниз.
        drop: function () {

            if (!pointer.fruit.is_can_drop) return;

            pointer.fruit.is_can_drop = false;

            let fruit_id = pointer.fruit.current_id;
            let radius = fruits[fruit_id].radius;

            fruits[fruit_id].items.push({
                body: new p2.Body({
                    mass: fruits[fruit_id].mass,
                    position: [pointer.x, pointer.y],
                    angularVelocity: get_random_float(angularVelocity_min, angularVelocity_max) * 5,
                    angle: pointer.fruit.angle,
                    limit_frames: limit_frames,
                }),
                shape: new p2.Circle({
                    radius: radius,
                }),
                image_radius: radius, // радиус для картинки
                // первый ли сейчас кадр. (нужно для того чтобы при создании фрукта его на первом кадре не отрисовывало на нулевых координатах)
                limit_frames: limit_frames,
            });

            let last_id = fruits[fruit_id].items.length - 1;

            fruits[fruit_id].items[last_id].body.addShape(fruits[fruit_id].items[last_id].shape);
            world.addBody(fruits[fruit_id].items[last_id].body);


            let max_id = 0;

            for (let i = fruits_count - 1; i > 0; i--) {
                if (fruits[i].items.length > 0) {
                    if (i > pointer.fruit.max_id) {
                        max_id = pointer.fruit.max_id;
                    } else {
                        max_id = i;
                    }
                    break;
                }
            }

            pointer.fruit.current_id = get_random_integer(0, max_id);

            let x = pointer.x;
            let y = pointer.y;
            let position = get_canvasCoords_from_physicCoords(x, y);
            refresh_pointer_position(position[0], position[1]);

            let count_of_steps = pointer.fruit.respawn_duration / 1000 * (scale_of_fps * fps);

            let id = pointer.fruit.current_id;

            pointer.fruit.step_of_radius = fruits[id].radius / count_of_steps;
            pointer.fruit.current_radius = 0;

            pointer.fruit.angle = get_random_float(0, Math.PI * 2);
        },
    },


    init: function () {
        pointer.fruit.current_radius = fruits[0].radius;
    },

    // рисует вертикальную линию обозначающую куда будет падать фрукт.
    draw: function () {
        if (this.is_pressed) this.draw_line();

        this.draw_fruit();
    },

    draw_fruit: function () {

        let x = this.x;
        let y = this.y;

        ctx_fruits.save();
        ctx_fruits.translate(x, y);
        ctx_fruits.rotate(pointer.fruit.angle);

        // делаем поправку для ананаса.
        let fruit_x, fruit_width;

        let id = this.fruit.current_id;
        pointer.fruit.current_radius += pointer.fruit.step_of_radius;

        if (pointer.fruit.current_radius > fruits[id].radius) {
            pointer.fruit.current_radius = fruits[id].radius;
            pointer.fruit.is_can_drop = true;
        }

        let radius = pointer.fruit.current_radius;

        if (id >= 7) {
            fruit_x = (id + 1) * image_fruits.height;
        } else fruit_x = id * image_fruits.height;

        if (id === 6) fruit_width = image_fruits.height * 2;
        else fruit_width = image_fruits.height;

        ctx_fruits.drawImage(
            image_fruits,
            fruit_x,
            0,
            fruit_width,
            image_fruits.height,
            -radius * fruits[id].image_offset_x,
            -radius * fruits[id].image_offset_y,
            radius * 2 * fruits[id].image_scale * (id === 6 ? 2 : 1),
            radius * 2 * fruits[id].image_scale,
        );

        ctx_fruits.restore();

    },

    draw_line: function () {
        let x = this.x;
        let HUD_height = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField;
        let position = get_physicCoords_from_canvasCoords(0, HUD_height);
        let radius = fruits[this.fruit.current_id].radius;
        let y_top = position[1] + radius;
        position = get_physicCoords_from_canvasCoords(0, gameField.height);
        let y_bottom = position[1];

        let lineWidth = gameField.width_in_meters * 0.008;

        //ctx_fruits.setLineDash([1.5, 1.0]); // Штрих 10px, пробел 5px
        ctx_fruits.setLineDash([lineWidth * 4.5, lineWidth * 3]); // Штрих 10px, пробел 5px


        ctx_fruits.beginPath();
        ctx_fruits.strokeStyle = '#FFFFFF36';
        ctx_fruits.lineWidth = lineWidth;
        ctx_fruits.moveTo(x, y_top);
        ctx_fruits.lineTo(x, y_bottom);
        ctx_fruits.stroke();
    },
}


let push_object = { // пнуть фрукт или бомбочку или ещё что-то.
    is_pressed_leftMouse: false, // зажата ли ЛКМ.
    angle: 0, // под каким углом направлена будет стрелка.
    angularVelocity_mode_scale: 1, // множитель во сколько раз нужно увеличить закрутку фрукта при выстреле им.

    total_power_mode_normal: 450,
    total_power_mode_boost: 1350,
    total_power_mode_gravity: 3000, // 700
    total_power: 450, // общая сила толчка на обе координаты XY.

    arrows_count: 10, // количество стрелочек из которых состоит большая стрелка для указания направления удара.
    between_arrows: 0.35, // расстояние между стрелочками.
    arrow_offset_X: 0.25, // смещение центра стрелочки по оси X.
    arrow_offset_Y: 0.25, // смещение края стрелочки по оси Y.
    lineWidth: 0.1, // толщина линии стрелочек.
    arrow_max_opacity: 0.99, // максимальная непрозрачность элементов стрелочки. (от 0 до 1).

    update_angle: function () {

        let x1 = world.getBodyById(selectedFruit.body_id).interpolatedPosition[0];
        let y1 = world.getBodyById(selectedFruit.body_id).interpolatedPosition[1];
        let x2 = mouseBody.interpolatedPosition[0];
        let y2 = mouseBody.interpolatedPosition[1];

        //push_object.angle = get_angle_between_2_points(x1, y1, x2, y2) + Math.PI; // вычисление угла у вектора.
        push_object.angle = get_angle_between_2_points(x1, y1, x2, y2); // вычисление угла у вектора.
    },

    draw_arrow: function () {

        ctx_fruits.save();

        let x = world.getBodyById(selectedFruit.body_id).interpolatedPosition[0];
        let y = world.getBodyById(selectedFruit.body_id).interpolatedPosition[1];

        ctx_fruits.translate(x, y);
        ctx_fruits.rotate(this.angle);

        ctx_fruits.lineWidth = this.lineWidth;
        let offset_X_shadow = this.lineWidth * 1.0;

        for (let i = 0; i < this.arrows_count; i++) {
            let opacity = this.arrow_max_opacity - ((this.arrow_max_opacity / this.arrows_count) * i);


            // тень
            ctx_fruits.strokeStyle = "rgb(150, 150, 150," + opacity + ")";
            ctx_fruits.beginPath();

            ctx_fruits.moveTo(this.between_arrows * i - offset_X_shadow, this.arrow_offset_Y);
            ctx_fruits.lineTo(this.between_arrows * i + this.arrow_offset_X - offset_X_shadow, 0);
            ctx_fruits.lineTo(this.between_arrows * i - offset_X_shadow, -this.arrow_offset_Y);

            ctx_fruits.stroke();


            // белое
            ctx_fruits.strokeStyle = "rgb(255, 255, 255," + opacity + ")";
            ctx_fruits.beginPath();

            ctx_fruits.moveTo(this.between_arrows * i, this.arrow_offset_Y);
            ctx_fruits.lineTo(this.between_arrows * i + this.arrow_offset_X, 0);
            ctx_fruits.lineTo(this.between_arrows * i, -this.arrow_offset_Y);

            ctx_fruits.stroke();
        }

        ctx_fruits.restore();
    },

    // толкает фрукт или бомбочку или ещё что-то.
    apply_force: function (id_body, angle, total_power, need_sound) {

        let x = Math.cos(angle);
        let y = Math.sin(angle);

        // делаем рандомную подкрутку фрукта для красоты (рандомно влево или вправо).
        let angularVelocity = get_random_float(2, 5);
        angularVelocity *= this.angularVelocity_mode_scale;

        // делаем рандомное направление либо влево закрутку либо вправо.
        if (get_random_integer(1, 2) === 1) angularVelocity *= -1;

        world.getBodyById(id_body).angularVelocity = angularVelocity;

        let fruit_id = get_info_about_gameObject_by_idBody(id_body).id;

        let scale = 150;

        /* world.getBodyById(id_body).force[0] = total_power * x * fruits[fruit_id].radius * 3;
        world.getBodyById(id_body).force[1] = total_power * y * fruits[fruit_id].radius * 3; */
        world.getBodyById(id_body).force[0] = total_power * x * scale;
        world.getBodyById(id_body).force[1] = total_power * y * scale;

        if (need_sound) sound_push_fruit.play();
    }
}



let selectedFruit = {
    body_id: -1, // id body выбранного фрукта (-1 значит не выбран мышкой ни один фрукт).
}



// счёты, текущий и лучший.
let scores = {
    items: [], // массив вылетающих очков под каждый происходящий сейчас мердж.
    value_current: 0, // текущий счёт.
    value_best: 0, // лучший счёт игрока за всё время.
    position_X: -6.4,
    position_Y: -7.85,
    angle_1_phase: Math.PI / 8, // угол направления полёта очков из фрукта.
    distance_1_phase: 3, // расстояние от мерджа до конца первой фазы.
    step_of_angle_1_phase: 0.02, // шаг в радианах для вычисления шага затухания в sin или cos.

    is_animation_inflate: false, // происходит ли сейчас анимация быстрого надувания и сдувания score.
    fontSize_default: 1.1, // дефолтный размер шрифта у score.
    fontSize_current: 1.1, // текущий размер шрифта у score.
    fontSize_scale_min: 0.4, // увеличение размера шрифта на первом фрукте.
    fontSize_scale_max: 1.2, // увеличение размера шрифта на последнем фрукте.
    // шаг увеличения размера шрифта между каждым последующим фруктом.
    fontSize_step: 0,
    fontSize_currentAngle: 0, // текущий угол у fontSize.
    fontSize_stepAngle: 0.25, // шаг угла у fontSize.
    id_fruit: 0, // очки от какого фрукта добавляются.
    scale_2_phase: 4,

    flying_font_size: 1, // размер шрифта летающих очков.

    plus_color: '#52f265', // цвет летающих очков со знаком плюс.
    //minus_color: '#ff4775', // цвет летающих очков со знаком минус.
    minus_color: '#ff4775', // цвет летающих очков со знаком минус.


    init: function () {
        this.distance_1_phase = fruits[0].radius * 3;
    },

    refresh: function () {
        document.getElementById('score_best_shadow').innerText = Math.floor(scores.value_best);
        document.getElementById('score_best').innerText = Math.floor(scores.value_best);

        document.getElementById('score_current_shadow').innerText = Math.floor(scores.value_current);
        document.getElementById('score_current').innerText = Math.floor(scores.value_current);
    },

    // добавляет или отнимает от score значение фрукта.
    plus_valueOfFruit: function (value, is_add) {
        if (is_add) this.value_current += value;
        else {
            if (this.value_current - value < 0) this.value = 0;
            else this.value_current -= value;
        }


        // делаем popup добавленных или вычитаемых очков над score.
        let width = document.getElementById('score_current').getBoundingClientRect().width;
        let height = document.getElementById('score_current').getBoundingClientRect().height;
        let left = document.getElementById('score_current').getBoundingClientRect().left;
        let top = document.getElementById('score_current').getBoundingClientRect().top;

        let center_X = left + width / 2;
        let center_Y = top + height / 2;

        add_new_popup_points(
            center_X,
            center_Y,
            is_add,
            value
        );
        // закончили popup.


        save_settings();


        document.getElementById('score_best').innerText = scores.value_best;
        document.getElementById('score_best_shadow').innerText = scores.value_best;

        document.getElementById('score_current').innerText = scores.value_current;
        document.getElementById('score_current_shadow').innerText = scores.value_current;


        let counter = document.getElementById('score_current_container');
        fast_scale_of_counter(counter);

        this.is_animation_inflate = true;

        /* setTimeout(() => {
            sound_add_score.play();
        }, 50); */
    },

    // добавляет новые летающие очки.
    add_new_item: function (position_X, position_Y, fruit_id, is_add) { // is_add - true если число со знаком "+", false - если "-".

        let value = fruits[fruit_id].score_value;

        if (!is_add) value *= 2; // для усложнения игры будем умножать сумму потерь очков в 2 раза.

        this.items.push({
            value: value,
            is_phase_1: true, // сейчас фаза 1 или 2. Если true - значит первая фаза.
            is_add: is_add, // если true - значит со знаком + и зелёным цветом, если false - значит минус и красным цветом.
            id_fruit: fruit_id,
            position_X: position_X,
            position_Y: position_Y,
            font_size: this.flying_font_size,
            angle_2_phase: 0, // угол направления полёта очков к общему счёту score.
            scale: fruits[fruit_id].radius / fruits[0].radius,
            current_angle_1_phase: 0,
            current_angle_2_phase: 0,
        })
    },

}


// анимация объединения двух одинаковых фруктов.
let merge_animation = {
    items: [], // сколько всего мерджей сейчас происходит.
    balls_count: 50, // количество брызгов.

    step_move_min: 0,
    step_move_max: 0.05,

    offset_ball_from_center_min: 0, // минимальное смещение от центра фрукта до стартовой точки шарика.
    offset_ball_from_center_max: 1.3, // максимальное смещение от центра фрукта до стартовой точки шарика.

    radius_ball_min: 0.15, // минимальный радиус шарика.
    radius_ball_max: 0.3, // максимальный радиус шарика.

    step_downsizing: 0.008, // шаг уменьшения размера шарика.

    set_settings: function () {

        let ratio = fruits[0].radius * 1.3;

        // скорость полёта шариков.
        this.step_move_min = 0.01 * ratio;
        this.step_move_max = 0.035 * ratio;

        this.offset_ball_from_center_min = 0.0 * ratio;
        this.offset_ball_from_center_max = 0.8 * ratio;

        this.radius_ball_min = 0.1 * ratio;
        this.radius_ball_max = 0.35 * ratio;

        this.step_downsizing = 0.005 * ratio;
    },


    // добавляет новый мердж.
    add: function (
        position_X,
        position_Y,
        fruit_id
    ) {

        merge_animation.items.push({
            balls: [], // шарики брызгов.
            // позиция центра XY где будет находиться взрыв шариков.
            position_X: position_X,
            position_Y: position_Y,
            // id какого из фруктов будем мерджить. Это нужно для выбора правильного цвета.
            fruit_id: fruit_id,
            scale: 1,
            step_downsizing: 1,
        });


        let merge_last_id = this.items.length - 1;

        let id = this.items[merge_last_id].fruit_id;

        let scale = fruits[id].radius / fruits[0].radius;

        this.items[merge_last_id].scale = scale;

        this.items[merge_last_id].step_downsizing = this.step_downsizing * scale / scale_of_fps;




        for (let i = 0; i < this.balls_count; i++) {
            this.items[merge_last_id].balls.push({
                angle: get_random_float(0, Math.PI * 2),
            })

            // устанавливаем координаты старта для каждого шарика.
            let offset = get_random_float(this.offset_ball_from_center_min, this.offset_ball_from_center_max) * scale;
            let position = get_coords_of_end_of_distance(
                this.items[merge_last_id].position_X,
                this.items[merge_last_id].position_Y,
                this.items[merge_last_id].balls[i].angle,
                offset
            );
            this.items[merge_last_id].balls[i].position_X = position[0];
            this.items[merge_last_id].balls[i].position_Y = position[1];

            this.items[merge_last_id].balls[i].step_move = get_random_float(this.step_move_min, this.step_move_max) * scale / scale_of_fps;

            this.items[merge_last_id].balls[i].radius = get_random_float(this.radius_ball_min, this.radius_ball_max) * scale;


            // ищем цвет шарика.
            let color, color_1, color_2, color_3, proportion_1, proportion_2;

            let temp_id = 0;

            proportion_1 = fruits[fruit_id - temp_id].merge_color_1.proportion;
            proportion_2 = fruits[fruit_id - temp_id].merge_color_2.proportion;
            color_1 = fruits[fruit_id - temp_id].merge_color_1.color;
            color_2 = fruits[fruit_id - temp_id].merge_color_2.color;
            color_3 = fruits[fruit_id - temp_id].merge_color_3.color;

            if (i <= Math.round(this.balls_count * proportion_1)) {
                color = color_1;
            } else {
                if (i <= Math.round(this.balls_count * (proportion_1 + proportion_2))) {
                    color = color_2;
                } else color = color_3;
            }

            this.items[merge_last_id].balls[i].color = color;
        }

        // перемешиваем рандомно цвета шариков.
        for (let i = 0; i < this.balls_count; i++) {

            let id = get_random_integer(0, this.balls_count - 1);

            if (i === id) continue;

            let temp_color = this.items[merge_last_id].balls[id].color;
            this.items[merge_last_id].balls[id].color = this.items[merge_last_id].balls[i].color;
            this.items[merge_last_id].balls[i].color = temp_color;
        }
    },

    update: function () { // изменяем данные каждого шарика на каждом шаге перед дальнейшей отрисовкой.

        for (let i = 0; i < this.items.length; i++) {

            let step_downsizing = this.items[i].step_downsizing;

            //console.log(performance.now(), step_downsizing);

            for (let j = 0; j < this.items[i].balls.length; j++) {

                // смещаем шарик на новые координаты.
                let position = get_coords_of_end_of_distance(
                    this.items[i].balls[j].position_X,
                    this.items[i].balls[j].position_Y,
                    this.items[i].balls[j].angle,
                    this.items[i].balls[j].step_move,
                );
                this.items[i].balls[j].position_X = position[0];
                this.items[i].balls[j].position_Y = position[1];

                if (this.items[i].balls[j].radius - step_downsizing > 0) {
                    this.items[i].balls[j].radius -= step_downsizing;
                } else {
                    this.items[i].balls.splice(j, 1);
                    j--;
                    // если все шарики уже удалены, то удаляем сам мердж из массива мерджей.
                    if (this.items[i].balls.length === 0) {
                        this.items.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }
        }

        this.draw();
    },

    draw: function () { // отрисовываем все шарики.

        for (let i = 0; i < this.items.length; i++) {
            for (let j = 0; j < this.items[i].balls.length; j++) {

                // тень.
                let radius_scale = 1.2;
                let shadow_color = '#FFFFFF65';
                let offset = this.items[i].balls[j].radius * 0.1;

                ctx_fruits.beginPath();
                ctx_fruits.fillStyle = shadow_color;
                ctx_fruits.arc(
                    this.items[i].balls[j].position_X + offset,
                    this.items[i].balls[j].position_Y - offset,
                    this.items[i].balls[j].radius * radius_scale,
                    0,
                    2 * Math.PI,
                );
                ctx_fruits.fill();


                // сам цвет.
                ctx_fruits.beginPath();
                ctx_fruits.fillStyle = this.items[i].balls[j].color;
                ctx_fruits.arc(
                    this.items[i].balls[j].position_X,
                    this.items[i].balls[j].position_Y,
                    this.items[i].balls[j].radius,
                    0,
                    2 * Math.PI,
                );
                ctx_fruits.fill();
            }
        }
    }
}



// создаёт и показывает тёмный полупрозрачный фон.
function create_and_show_background_dark(x, y, width, height) {

    let background_dark = document.createElement('div');
    document.body.append(background_dark);
    background_dark.id = 'training_fruits_background_dark';
    background_dark.className = 'background_dark';

    let background_dark_top = document.createElement('div');
    background_dark.append(background_dark_top);
    background_dark_top.className = 'background_dark_element';
    background_dark_top.style.left = 0;
    background_dark_top.style.top = 0;
    background_dark_top.style.width = '100%';
    background_dark_top.style.height = y + 'px';

    let background_dark_bottom = document.createElement('div');
    background_dark.append(background_dark_bottom);
    background_dark_bottom.className = 'background_dark_element';
    background_dark_bottom.style.left = 0;
    background_dark_bottom.style.top = y + height + 'px';
    background_dark_bottom.style.width = '100%';
    background_dark_bottom.style.height = canvas_HUD.height - y - height + 'px';

    let background_dark_left = document.createElement('div');
    background_dark.append(background_dark_left);
    background_dark_left.className = 'background_dark_element';
    background_dark_left.style.left = 0;
    background_dark_left.style.top = y + 'px';
    background_dark_left.style.width = x + 'px';
    background_dark_left.style.height = height + 'px';

    let background_dark_right = document.createElement('div');
    background_dark.append(background_dark_right);
    background_dark_right.className = 'background_dark_element';
    background_dark_right.style.left = x + width + 'px';
    background_dark_right.style.top = y + 'px';
    background_dark_right.style.width = canvas_HUD.width - x - width + 'px';
    background_dark_right.style.height = height + 'px';


    background_dark.animate(
        [
            { opacity: 0 },
            { opacity: 1, visibility: 'visible' },
        ],
        {
            fill: 'forwards',
            duration: 500,
        }
    );

}




// иконки восклицательного знака на settings и счётчике звёздочек.
let icons_info = {
    was_opened_window_settings: false, // было ли уже открыто окно настроек, если да, то иконку info с восклицательным знаком больше не показывать.
    was_opened_window_stars: false, // было ли уже открыто окно звёздочек, если да, то иконку info с восклицательным знаком больше не показывать.


    // обновляет размеры и расположение иконок.
    refresh: function () {

        let star_counter_container = document.getElementById('star_counter_container');
        star_counter_container = star_counter_container.getBoundingClientRect();
        let size = star_counter_container.height * 0.6;

        if (!icons_info.was_opened_window_settings) {
            // восклицательный знак для settings.
            let icons_info_settings = document.getElementById('icons_info_settings');

            let settings = document.getElementById('settings');
            let z_Index = getComputedStyle(settings).zIndex;
            settings = settings.getBoundingClientRect();

            icons_info_settings.style.display = 'flex';
            icons_info_settings.style.width = size + 'px';
            icons_info_settings.style.height = size + 'px';
            icons_info_settings.style.zIndex = z_Index + 1;
            icons_info_settings.style.left = settings.left + settings.width * 0.78 + 'px';
            icons_info_settings.style.top = settings.top - settings.height * 0.1 + 'px';
            icons_info_settings.classList.remove('pause_pulse_low');
            icons_info_settings.classList.add('pause_pulse_low');
        }

        if (!icons_info.was_opened_window_stars) {
            // восклицательный знак для счётчика звёздочек.
            let icons_info_stars = document.getElementById('icons_info_stars');

            star_counter_container = document.getElementById('star_counter_container');
            z_Index = getComputedStyle(star_counter_container).zIndex;
            star_counter_container = star_counter_container.getBoundingClientRect();

            icons_info_stars.style.display = 'flex';
            icons_info_stars.style.width = size + 'px';
            icons_info_stars.style.height = size + 'px';
            icons_info_stars.style.zIndex = z_Index + 1;
            icons_info_stars.style.zIndex = 201;
            icons_info_stars.style.left = star_counter_container.left + star_counter_container.width * 0.9 + 'px';
            icons_info_stars.style.top = star_counter_container.top - star_counter_container.height * 0.18 + 'px';
            icons_info_stars.classList.remove('pause_pulse_low');
            icons_info_stars.classList.add('pause_pulse_low');
        }

    },
}



// включает в нужное место подсказку что именно сюда надо кликнуть или тапнуть. Короче круги сужаться будут к центру.
function show_click(x, y) {
    let div_click = document.createElement('div');
    div_click.id = 'show_click';
    document.body.append(div_click);

    div_click.style.zIndex = 200;

    div_click.style.translate = '-50% -50%';

    let star_counter = document.getElementById('star_counter_container');
    let star_counter_sizes = getComputedStyle(star_counter);
    let size = parseFloat(star_counter_sizes.height) * 2.3;

    div_click.style.width = size + 'px';
    div_click.style.height = size + 'px';
    div_click.style.left = x + 'px';
    div_click.style.top = y + 'px';
    div_click.style.border = size * 0.16 + 'px solid #FFFFFFFF'; // 21FF03FF 03F7FFFF
    div_click.style.borderRadius = '50%';
    div_click.style.position = 'absolute';
    div_click.style.pointerEvents = 'none';
    div_click.style.filter = 'blur(' + size * 0.045 + 'px)';

    div_click.className = 'show_click';
}


// вычисляет координаты XY у конца проложенного отрезка определённой длины и под определённым углом.
function get_coords_of_end_of_distance(x, y, angle, length) {

    let end_X = x + length * Math.cos(angle);
    let end_Y = y + length * Math.sin(angle);

    return [end_X, end_Y];
}




/* window.addEventListener('load', function () {
}); */



function start_1() {
    console.log(333);
    /* console.log(111, performance.now()); */
}


function Start_game() {  // скачивает все сохранения и настройки игры из облака.

    if (is_testing) {

        // отключаем звук в игре.
        /* Howler.mute(true);
        sounds.is_mute = true; */

        //set_settings_in_testing();

        init();

        download_settings();


        // Самый первый запуск анимации.
        animation_id = requestAnimationFrame(animation);


        //open_window_settings();
        //open_window_stars();

        //training_fruits.show_popup();
        //create_and_show_background_dark(1, 1, 1, 1);

        return;
    }



    if (platform === platforms.GAME_PUSH) {

        window.onGPInit = async (_gp) => {

            gp = _gp;

            gp.player.ready;

            // Игрок готов
            gp.player.on('ready', () => {

                console.log('Игрок готов! ---- ' + performance.now());

                /* // Показать preloader, возвращает промис.
                if (gp.ads.isPreloaderAvailable) gp.ads.showPreloader();

                // включаем показ Sticky-баннера.
                if (gp.ads.isStickyAvailable) gp.ads.showSticky(); */

                is_mobile = gp.isMobile;

                // получаем игровые переменные (флаги) с сервера и вставляем в игру.
                gp.variables.fetch();

                // Событие при загрузке
                gp.variables.on('fetch', () => {

                    if (is_mobile) {
                        FullScreen_ads_delay = gp.variables.get('FullScreen_ads_delay_mobile');
                    } else {
                        FullScreen_ads_delay = gp.variables.get('FullScreen_ads_delay_desktop');
                    }

                    count_stars_after_FullScreen_ads = gp.variables.get('count_stars_after_FullScreen_ads');

                    can_save_to_cloud_delay = gp.variables.get('can_save_to_cloud_delay');

                    stars.button_delete_fruit.price = gp.variables.get('stars_button_delete_fruit_price');

                    red_line.duration_in_seconds = gp.variables.get('red_line_duration_in_seconds');


                    stars.button_delete_fruit.refresh();
                });

                if (gp.language === 'ru') language = languages.RU;
                else language = languages.EN;

                init();

                download_settings();

                // отключаем кнопку share если шаринг не поддерживается на платформе.
                if (!gp.socials.isSupportsShare) document.getElementById('share').style.display = 'none';

                // Самый первый запуск анимации.
                animation_id = requestAnimationFrame(animation);

                // уведомляем GamePush о старте игры.
                gp.gameStart();
                console.log('gp.gameStart()');

            });




            // Сохранение в облако.
            // Игрок синхронизирован, т.е. сохраняем в облако (success === true значит удачно) 
            gp.player.on('sync', (success) => {
                if (success) { // удачно сохранилось в облако.
                    console.log('Настройки игрока сохранены в облако.');
                }
                else { // ошибка сохранения в облако.
                    console.log('Не удалось сохранить настройки игрока в облако.');
                }
            });



            // Шаринг в соцсетях.
            gp.socials.on('share', (success) => {
                // success = true, если успешно выполнено действие "поделиться"
                if (success) {
                    console.log('Поделился!');
                } else {
                    console.log('Не получилось поделиться!');
                }
            });


            // отключаем показ leaderboard на GAME_DISTRIBUTION.
            if (gp.platform.type === 'GAME_DISTRIBUTION') {
                document.getElementById('leaderboard').style.display = 'none';
                document.getElementById('share').style.display = 'none';
            }



            // Начался показ Preloader-рекламы.
            gp.ads.on('preloader:start', () => {
                //pause_game(true);
                Howler.mute(true);
            });
            // Закончился показ Preloader-рекламы.
            gp.ads.on('preloader:close', (success) => {
                //continue_game();
                if (!sounds.is_mute) Howler.mute(false);
            });



            // Начался показ видеорекламы.
            gp.ads.on('rewarded:start', () => {
                console.log('Начался показ видеорекламы --- ' + performance.now());

                is_playing_FullScreen_or_Rewarded = true;

                pause_game(true);
            });
            // Закончился показ видеорекламы.
            gp.ads.on('rewarded:close', (success) => {
                console.log('Закончился показ видеорекламы --- ' + performance.now());

                is_playing_FullScreen_or_Rewarded = false;

                if (!sounds.is_mute) Howler.mute(false);

                continue_game();
            });
            // После успешного просмотра видео-рекламы.
            gp.ads.on('rewarded:reward', () => {

                stars.value += stars.rewarded_value;

                // принудительно сохраняем в облако.
                can_save_to_cloud = true;
                save_settings();

                setTimeout(() => {
                    show_popup_of_purchased_stars(stars.rewarded_value);
                }, stars.delay_between_purchases / 3);

            });


            // Начался показ FullScreen-рекламы.
            gp.ads.on('fullscreen:start', () => {
                console.log('Начался показ FullScreen-рекламы --- ' + performance.now());
            });

            // Закончился показ FullScreen-рекламы.
            gp.ads.on('fullscreen:close', (success) => {

                console.log('Закончился показ FullScreen-рекламы --- ' + performance.now());

                is_playing_FullScreen_or_Rewarded = false;

                continue_game();

                document.getElementById('dark_layer_2').animate(
                    [
                        { opacity: 1 },
                        { opacity: 0, visibility: 'hidden' },
                    ],
                    {
                        fill: 'forwards',
                        duration: 300,
                    }
                );

                time_of_last_FullScreen_ads = performance.now();

                stars.value += count_stars_after_FullScreen_ads;

                setTimeout(() => {
                    show_popup_of_purchased_stars(count_stars_after_FullScreen_ads);
                }, 300);

            });



            // При открытии лидерборда.
            gp.leaderboard.on('open', () => {
                pause_game(false);
            });
            // При закрытии лидерборда.
            gp.leaderboard.on('close', () => {
                continue_game();
            });
        };
    }




    if (platform === platforms.YANDEX_GAMES) {

        YaGames
            .init()
            .then(_ysdk => {
                ysdk = _ysdk;

                ysdk.features.LoadingAPI?.ready();
                console.log('LoadingAPI активирован (игра загрузила все ресурсы и готова к взаимодействию с пользователем.) --- ' + performance.now());

                // определение языка (оно нужно обязательно, даже если не будешь этим пользоваться, модерация просто не пропустит игру).
                language = ysdk.environment.i18n.lang;
                if (language === 'ru') language = languages.RU;
                else language = languages.EN;

                // определяем на телефоне ли играет игрок. Или на компе.
                is_mobile = ysdk.deviceInfo.isMobile();

                // получаем флаги с сервера и внедряем в игру.
                ysdk.getFlags({
                    defaultFlags: {
                        FullScreen_ads_delay_mobile: 33,
                        FullScreen_ads_delay_desktop: 33,
                        count_stars_after_FullScreen_ads: 33,
                        can_save_to_cloud_delay: 33,
                        stars_button_delete_fruit_price: 33,
                        red_line_duration_in_seconds: 33,
                    }
                })
                    .then(flags => {

                        //console.log(flags);

                        if (is_mobile) {
                            FullScreen_ads_delay = parseInt(flags.FullScreen_ads_delay_mobile);
                        } else {
                            FullScreen_ads_delay = parseInt(flags.FullScreen_ads_delay_desktop);
                        }

                        count_stars_after_FullScreen_ads = parseInt(flags.count_stars_after_FullScreen_ads);
                        can_save_to_cloud_delay = parseInt(flags.can_save_to_cloud_delay);
                        stars.button_delete_fruit.price = parseInt(flags.stars_button_delete_fruit_price);
                        red_line.duration_in_seconds = parseInt(flags.red_line_duration_in_seconds);
                        stars.button_delete_fruit.refresh();
                    });


                // получаем Player
                ysdk.getPlayer().then(_player => {

                    player = _player;
                    console.log('Player получен --- ' + performance.now());

                    player.getStats().then(_dataPlayer => {

                        dataPlayer = _dataPlayer;
                        console.log('Данные игрока успешно скачаны --- ' + performance.now());

                        // если не получилось скачать настройки игры, значит не надо запускать игру, пусть игрок сам перезапустит страничку, потому что произошёл какой-то сбой, возможно на сервере.

                        //console.log('До проверки try_download_settings()' + performance.now());

                        init();

                        download_settings();

                        //console.log('После проверки try_download_settings()' + performance.now());

                        ysdk.features.GameplayAPI?.start();
                        console.log('GameReadyAPI активирован --- ' + performance.now());

                        // Самый первый запуск анимации.
                        animation_id = requestAnimationFrame(animation);

                        //console.log('Перед check_unconsumed_purchases() ' + performance.now());

                        // Подписка на события 'game_api_pause'. По сути мне нужно чисто для отслеживания когда FullScreen-реклама запустится.
                        ysdk.on('game_api_pause', () => {
                            console.log('game_api_pause');
                        });

                        // Подписка на события 'game_api_resume'. По сути мне нужно чисто для отслеживания когда FullScreen-реклама закроется.
                        ysdk.on('game_api_resume', () => {

                            console.log('game_api_resume');

                            // делаю это чисто для того чтобы при старте игры когда выходит Preloader-реклама, когда её закрываешь на крестик, то сразу буду запускаться геймплей, чтобы перед показом Preload-рекламы не запускалась игра, а то можно случайно кликнуть по Preload-рекламе.
                            /* if (!was_shown_pleloader_ads) {
                                was_shown_pleloader_ads = true;
                            } */
                        });

                        //console.log('Конец ' + performance.now());


                    }).catch(err => {
                        console.log('Не удалось скачать данные игрока с облака Яндекса. ' + err + ' --- ' + performance.now());
                    });

                }).catch(err => {
                    console.log('Ошибка при получении Player. --- ' + err + ' --- ' + performance.now());
                });

            }).catch(console.error);
    }
}



function download_settings() { // сначала проверяет на целостность данные из localstorage и если они все целы, то вставляет их в игру. Если же не все целы, то берёт данные из облака то, что цело и можно вставить.

    if (try_download_settings_from_localStorage()) {
        return;
    } else {
        download_settings_from_cloud();
    }
}



// выкачивает настройки игры из локального хранилища браузера, если данные все целые и удалось вставить в игру, то возвращает true, если не удалось, то false.
function try_download_settings_from_localStorage() {

    //return false;


    if (localStorage.getItem('tri23_fruits_coords') === null) return false;

    if (localStorage.getItem('tri23_score_current') === null ||
        check_string_is_number(localStorage.getItem('tri23_score_current')) === false) return false;

    if (localStorage.getItem('tri23_score_best') === null ||
        check_string_is_number(localStorage.getItem('tri23_score_best')) === false) return false;

    if (localStorage.getItem('tri23_stars_value') === null ||
        check_string_is_number(localStorage.getItem('tri23_stars_value')) === false) return false;

    if (localStorage.getItem('tri23_sounds_is_mute') === null ||
        check_string_is_boolean(localStorage.getItem('tri23_sounds_is_mute')) === false) return false;

    if (localStorage.getItem('tri23_sounds_volume') === null ||
        check_string_is_number(localStorage.getItem('tri23_sounds_volume')) === false) return false;




    if (localStorage.getItem('tri23_is_started_timer_red_line') === null ||
        check_string_is_boolean(localStorage.getItem('tri23_is_started_timer_red_line')) === false) return false;

    if (localStorage.getItem('tri23_counter_seconds_red_line') === null ||
        check_string_is_number(localStorage.getItem('tri23_counter_seconds_red_line')) === false) return false;




    // вытаскиваем массив координат всех фруктов.
    let storedArrayFruits = localStorage.getItem('tri23_fruits_coords');

    if (storedArrayFruits) {
        storedArrayFruits = JSON.parse(storedArrayFruits);
    } else return false;


    // удаляем все фрукты с поля.
    if (fruits.length > 0) {
        for (let i = 0; i < fruits_count; i++) {
            for (let j = fruits[i].items.length - 1; j >= 0; j--) {
                delete_body_fruit(fruits[i].items[j].body);
            }
        }
    }

    fruits = [];
    set_settings_fruits();

    // заново добавляем все сохранённые в localSrorage фрукты на поле.
    for (let i = 0; i < fruits_count; i++) {
        // добавляем в мир все фрукты одного и того же вида.
        for (let j = 0; j < storedArrayFruits[i].length; j++) {

            let radius = fruits[i].radius;
            let x = storedArrayFruits[i][j].x;
            let y = storedArrayFruits[i][j].y;
            let angle = storedArrayFruits[i][j].angle;

            // конвертируем координаты фруктов относительные gameField в canvas-координаты.
            let offset_left = (canvas_gameField.width - gameField.width) / 2;
            x = offset_left + gameField.width * x;
            y = gameField.height * y;

            let position = get_physicCoords_from_canvasCoords(x, y);

            fruits[i].items.push({
                body: new p2.Body({
                    mass: fruits[i].mass,
                    position: [position[0], position[1]],
                    //angularVelocity: get_random_float(angularVelocity_min, angularVelocity_max),
                    angle: angle,
                    //angularDamping: 0.5,
                }),
                shape: new p2.Circle({
                    radius: radius,
                }),
                image_radius: radius, // радиус для картинки
                limit_frames: limit_frames, // первый ли сейчас кадр. (нужно для того чтобы при создании фрукта его на первых кадрах не отрисовывало на нулевых координатах)
            });

            fruits[i].items[j].body.addShape(fruits[i].items[j].shape);
            world.addBody(fruits[i].items[j].body);
        }
    }


    scores.value_current = parseInt(localStorage.getItem('tri23_score_current'));
    scores.value_best = parseInt(localStorage.getItem('tri23_score_best'));
    stars.value = parseInt(localStorage.getItem('tri23_stars_value'));
    sounds.is_mute = localStorage.getItem('tri23_sounds_is_mute').toLowerCase() === 'true' ? true : false;
    sounds.volume = parseFloat(localStorage.getItem('tri23_sounds_volume'));

    let temp_is_started_timer = localStorage.getItem('tri23_is_started_timer_red_line').toLowerCase() === 'true' ? true : false;
    red_line.counter_seconds = parseInt(localStorage.getItem('tri23_counter_seconds_red_line'));

    if (!red_line.is_started_timer && temp_is_started_timer) {
        red_line.start_timer();
        red_line.counter_seconds = parseInt(localStorage.getItem('tri23_counter_seconds_red_line'));
    }

    scores.refresh();
    stars.refresh();
    sounds.refresh();

    console.log('Данные из localStorage успешно вставлены в игру --- ' + performance.now());

    return true;
}



// скачивает из облака настройки игры.
function download_settings_from_cloud() {

    if (is_testing) return;


    if (platform === platforms.GAME_PUSH) {

        let temp = gp.player.get('score');
        if (temp !== undefined &&
            typeof temp === 'number' &&
            temp === 0) {
            // значит это первый запуск игры.
            first_start_game();
            return;
        }

        if (temp !== undefined && typeof temp === 'number')
            scores.value_best = temp;

        /* temp = gp.player.get('score_current');
        if (temp !== undefined && typeof temp === 'number')
            scores.value_current = temp; */

        temp = gp.player.get('stars_value');
        if (temp !== undefined && typeof temp === 'number')
            stars.value = temp;

        temp = gp.player.get('sounds_is_mute');
        if (temp !== undefined && typeof temp === 'boolean')
            sounds.is_mute = temp;

        temp = gp.player.get('sounds_volume');
        if (temp !== undefined && typeof temp === 'number')
            sounds.volume = temp;

        console.log('Загрузила и вставила данные из облака --- ', performance.now());
    }


    if (platform === platforms.YANDEX_GAMES) {

        // проверяем скачанные из облака настройки игры на целостность, если переменная существует, то добавляем её в игру.

        if (dataPlayer.score !== undefined && typeof dataPlayer.score === 'number') scores.value_best = dataPlayer.score;

        /* if (dataPlayer.score_current !== undefined && typeof dataPlayer.score_current === 'number') scores.value_current = dataPlayer.score_current; */

        if (dataPlayer.stars_value !== undefined && typeof dataPlayer.stars_value === 'number') stars.value = dataPlayer.stars_value;

        if (dataPlayer.sounds_is_mute !== undefined && typeof dataPlayer.sounds_is_mute === 'number') {
            if (dataPlayer.sounds_is_mute === 1) sounds.is_mute = true;
            else sounds.is_mute = false;
        }

        if (dataPlayer.sounds_volume !== undefined && typeof dataPlayer.sounds_volume === 'number') sounds.volume = dataPlayer.sounds_volume;
    }

    scores.refresh();
    stars.refresh();
    sounds.refresh();
}


function save_settings() {
    save_settings_to_localStorage();
    save_settings_to_cloud();
}


// сохраняет настройки игры в localStorage (локальное хранилище в браузере).
function save_settings_to_localStorage() {

    // делаю приписку (tri23) перед ключом, чтобы ключ был 100% уникальным, иначе возможно, что Яндекс или GamePush создадут точно такой же ключ и будет конфликт, в итоге сохранения могут не сработать.

    let fruitsArray = [];

    for (let i = 0; i < fruits_count; i++) {
        let itemsArray = [];
        let count = fruits[i].items.length;

        for (let j = 0; j < count; j++) {

            let angle = fruits[i].items[j].body.angle;

            let x = fruits[i].items[j].body.position[0];
            let y = fruits[i].items[j].body.position[1];

            let position = get_canvasCoords_from_physicCoords(x, y);

            x = position[0];
            y = position[1];

            // переводим координаты фруктов в относительные gameField, от 0 до 1.
            let offset_left = (canvas_gameField.width - gameField.width) / 2;
            x -= offset_left;
            x /= gameField.width;
            y /= gameField.height;

            itemsArray.push({
                x: x,
                y: y,
                angle: angle,
            });
        }

        fruitsArray.push(itemsArray);
    }

    // вставляем массив с координатами фруктов в localStorage.
    localStorage.setItem('tri23_fruits_coords', JSON.stringify(fruitsArray));


    localStorage.setItem('tri23_score_current', Math.floor(scores.value_current));
    localStorage.setItem('tri23_score_best', Math.floor(scores.value_best));
    localStorage.setItem('tri23_stars_value', Math.floor(stars.value));
    localStorage.setItem('tri23_sounds_is_mute', sounds.is_mute);
    localStorage.setItem('tri23_sounds_volume', sounds.volume);

    localStorage.setItem('tri23_is_started_timer_red_line', red_line.is_started_timer);
    localStorage.setItem('tri23_counter_seconds_red_line', red_line.counter_seconds);


    console.log('====== Сохранило в localStorage ====== ' + performance.now());
}


// сохраняет настройки игры в облако.
function save_settings_to_cloud() {

    if (is_testing) return;

    if (!can_save_to_cloud) return;

    if (platform === platforms.GAME_PUSH) {

        gp.player.set('score', Math.floor(scores.value_best));
        //gp.player.set('score_current', Math.floor(scores.value_current));
        gp.player.set('stars_value', Math.floor(stars.value));
        gp.player.set('sounds_is_mute', sounds.is_mute);
        gp.player.set('sounds_volume', sounds.volume);

        gp.player.sync({ storage: 'preferred' }); // закачивает настройки игры в облако.
    }


    if (platform === platforms.YANDEX_GAMES) {

        // команда setStats отправляет только числовые значения, а раз нельзя передать текст и булевые значения, вместо true передавать буду 1, а вместо false 0.
        player.setStats({

            score: Math.floor(scores.value_best),
            //score_current: Math.floor(scores.value_current),
            stars_value: Math.floor(stars.value),
            sounds_is_mute: sounds.is_mute ? 1 : 0,
            sounds_volume: sounds.volume,

        }).then(() => {
            console.log('Данные загружены в облако.');
        }).catch(err => {
            console.log('Ошибка при сохранении в облако. --- ' + err + ' --- ' + performance.now());
        });

        // загружаем новый результат в leaderboard в облако.
        ysdk.leaderboards.setScore('myLeaderboard', scores.value_best);
    }

    can_save_to_cloud = false;

    setTimeout(() => {
        can_save_to_cloud = true;
    }, can_save_to_cloud_delay);
}





// в тестировании установка правильного количества фруктов на поле.
function set_settings_in_testing() {

    //stars.value = 1000000;

    /* fruits_start[0] = 0;
    fruits_start[1] = 2;
    fruits_start[2] = 0;
    fruits_start[3] = 0;
    fruits_start[4] = 0;
    fruits_start[5] = 0;
    fruits_start[6] = 0;
    fruits_start[7] = 0;
    fruits_start[8] = 0;
    fruits_start[9] = 0;
    fruits_start[10] = 0;
    fruits_start[11] = 0;
    fruits_start[12] = 0;
    fruits_start[13] = 0;
    fruits_start[14] = 0; */




    fruits_start[0] = 1;
    fruits_start[1] = 1;
    fruits_start[2] = 1;
    fruits_start[3] = 1;
    fruits_start[4] = 1;
    fruits_start[5] = 1;
    fruits_start[6] = 1;
    fruits_start[7] = 1;
    fruits_start[8] = 1;
    fruits_start[9] = 1;
    fruits_start[10] = 1;
    fruits_start[11] = 1;
    fruits_start[12] = 1;
    fruits_start[13] = 1;
    fruits_start[14] = 1;


    /* fruits_start[0] = 2;
    fruits_start[1] = 2;
    fruits_start[2] = 2;
    fruits_start[3] = 2;
    fruits_start[4] = 2;
    fruits_start[5] = 2;
    fruits_start[6] = 2;
    fruits_start[7] = 2;
    fruits_start[8] = 2;
    fruits_start[9] = 2;
    fruits_start[10] = 2;
    fruits_start[11] = 2;
    fruits_start[12] = 2;
    fruits_start[13] = 2;
    fruits_start[14] = 2; */
}


// установка настроек игры при старте.

function set_settings_fruits() {
    let radius_1 = gameField.width_in_meters * first_fruit_radius; // радиус первого фрукта.
    let step = radius_1 * step_of_radius_by_first_fruit;

    for (let i = 0; i < fruits_count; i++) {

        fruits.push(new Fruit());

        let radius_current = radius_1 + step * i;

        // масса первого фрукта = 1.
        let mass = Math.pow(radius_current / radius_1, 3); // чем больше диаметр кружка, тем больше масса.

        fruits[i].radius = radius_current;
        fruits[i].mass = mass;
        fruits[i].score_value = Math.pow(2, i);
    }

    scale_and_offset_images_of_fruits();

    merge_animation.set_settings();
}





// обновляет настройки фруктов.
function refresh_settings_of_fruits() {

    // вытаскиваем массив координат всех фруктов.
    let storedArrayFruits = localStorage.getItem('tri_fruits_coords');

    if (storedArrayFruits) {
        storedArrayFruits = JSON.parse(storedArrayFruits);
    }


    // удаляем все фрукты с поля.
    if (fruits.length > 0) {
        for (let i = 0; i < fruits_count; i++) {
            for (let j = fruits[i].items.length - 1; j >= 0; j--) {
                delete_body_fruit(fruits[i].items[j].body);
            }
        }
    }

    fruits = [];

    // заново добавляем все сохранённые в localSrorage фрукты на поле.
    for (let i = 0; i < fruits_count; i++) {
        fruits.push(new Fruit());

        fruits[i].radius = 30;
        fruits[i].mass = 1; // чем больше диаметр кружка, тем больше масса.
        fruits[i].score_value = Math.pow(2, i);
    }


    for (let i = 0; i < fruits_count; i++) {
        // добавляем в мир все фрукты одного и того же вида.
        for (let j = 0; j < storedArrayFruits[i].length; j++) {

            let radius = fruits[i].radius;
            let x = storedArrayFruits[i][j].x;
            let y = storedArrayFruits[i][j].y;
            let angle = storedArrayFruits[i][j].angle;

            // конвертируем координаты фруктов относительные gameField в canvas-координаты.
            let offset_left = (canvas_gameField.width - gameField.width) / 2;
            x = offset_left + gameField.width * x;
            y = gameField.height * y;

            let position = get_physicCoords_from_canvasCoords(x, y);

            fruits[i].items.push({
                body: new p2.Body({
                    mass: fruits[i].mass,
                    position: [position[0], position[1]],
                    //angularVelocity: get_random_float(angularVelocity_min, angularVelocity_max),
                    angle: angle,
                    //angularDamping: 0.5,
                }),
                shape: new p2.Circle({
                    radius: radius,
                }),
                image_radius: radius, // радиус для картинки
                limit_frames: limit_frames, // первый ли сейчас кадр. (нужно для того чтобы при создании фрукта его на первых кадрах не отрисовывало на нулевых координатах)
            });

            fruits[i].items[j].body.addShape(fruits[i].items[j].shape);
            world.addBody(fruits[i].items[j].body);
        }
    }


    selectedFruit.body_id = -1;




    /* fruits = [];

    for (let i = 0; i < fruits_count; i++) {
        fruits.push(new Fruit());

        fruits[i].radius = 1;
        fruits[i].mass = 1; // чем больше диаметр кружка, тем больше масса.
        fruits[i].score_value = Math.pow(2, i);
    }


    for (let i = 0; i < fruits_count; i++) {
        // добавляем в мир все фрукты одного и того же вида.
        for (let j = 0; j < fruits_start[i]; j++) {

            let radius = fruits[i].radius;
            let position = get_free_XY_in_gameField(game_objects.FRUIT, radius);

            fruits[i].items.push({
                body: new p2.Body({
                    mass: fruits[i].mass,
                    position: [position[0], position[1]],
                    angularVelocity: get_random_float(angularVelocity_min, angularVelocity_max),
                }),
                shape: new p2.Circle({ radius: radius }),
                image_radius: radius, // радиус для картинки
                limit_frames: limit_frames, // первый ли сейчас кадр. (нужно для того чтобы при создании фрукта его на первых кадрах не отрисовывало на нулевых координатах)
            });

            fruits[i].items[j].body.addShape(fruits[i].items[j].shape);
            world.addBody(fruits[i].items[j].body);
        }
    } */
}


// получает угол между двумя точками.
function get_angle_between_2_points(x1, y1, x2, y2) {
    let angle = Math.atan2(y2 - y1, x2 - x1);
    return angle;
}


function get_random_float(min, max) {
    // генерирует случайное дробное число от min до max (не превышая max).
    let random = min + Math.random() * (max - min);
    return random;
}

function get_random_integer(min, max) {
    // генерирует случайное целое число от min включительно до max включительно.
    let random = min + Math.random() * (max + 1 - min);
    return Math.floor(random);
}






// обрабатываем касания фруктов с разными объектами.
function check_collision(body_1_id, body_2_id) {

    let gameObject_1_info = get_info_about_gameObject_by_idBody(body_1_id);
    let gameObject_2_info = get_info_about_gameObject_by_idBody(body_2_id);

    if (gameObject_1_info === undefined || gameObject_2_info === undefined) return;


    // если это 2 одинаковых фрукта.
    if (
        gameObject_1_info.gameObject === game_objects.FRUIT &&
        gameObject_2_info.gameObject === game_objects.FRUIT &&
        gameObject_1_info.id === gameObject_2_info.id
    ) {

        merge(body_1_id, body_2_id);
    }
}


// получает инфу по id_body какой это объект из списка (фрукт или бомбочки или ещё что-то) и его id.
function get_info_about_gameObject_by_idBody(id_body) {

    let gameObject_info = {
        gameObject: game_objects.FRUIT,
        id: 1,
    };

    // проверка не фрукт ли это.
    for (let i = 0; i < fruits_count; i++) {
        for (let j = 0; j < fruits[i].items.length; j++) {
            if (fruits[i].items[j].body.id === id_body) {
                gameObject_info.gameObject = game_objects.FRUIT;
                gameObject_info.id = i;
                return gameObject_info;
            }
        }
    }


    // проверка не стенка gameField ли это.
    if (topPlaneBody.id === id_body) {
        gameObject_info.gameObject = game_objects.PLANE;
        gameObject_info.id = topPlaneBody.id;
        return gameObject_info;
    }
    if (bottomPlaneBody.id === id_body) {
        gameObject_info.gameObject = game_objects.PLANE;
        gameObject_info.id = bottomPlaneBody.id;
        return gameObject_info;
    }
    if (leftPlaneBody.id === id_body) {
        gameObject_info.gameObject = game_objects.PLANE;
        gameObject_info.id = leftPlaneBody.id;
        return gameObject_info;
    }
    if (rightPlaneBody.id === id_body) {
        gameObject_info.gameObject = game_objects.PLANE;
        gameObject_info.id = rightPlaneBody.id;
        return gameObject_info;
    }
}


function merge(body_1_id, body_2_id) { // делаем слияние двух фруктов.

    sound_push_fruit.play();

    // находим какой из двух фруктов быстрее движется, и его оставляем, а второй удаляем.
    let body_1 = world.getBodyById(body_1_id);
    let body_2 = world.getBodyById(body_2_id);
    let velocity_1 = Math.abs(body_1.velocity[0]) + Math.abs(body_1.velocity[1]);
    let velocity_2 = Math.abs(body_2.velocity[0]) + Math.abs(body_2.velocity[1]);
    if (velocity_1 < velocity_2) {
        let temp = body_1_id;
        body_1_id = body_2_id;
        body_2_id = temp;
    }

    let fruit_1_id = get_info_about_gameObject_by_idBody(body_1_id).id;
    let fruit_1_item_id = get_idItem_by_idBody(body_1_id);
    let fruit_2_id = get_info_about_gameObject_by_idBody(body_2_id).id;
    let fruit_2_item_id = get_idItem_by_idBody(body_2_id);


    merge_animation.add(
        fruits[fruit_1_id].items[fruit_1_item_id].body.position[0],
        fruits[fruit_1_id].items[fruit_1_item_id].body.position[1],
        fruit_1_id
    );


    let merge_last_id = merge_animation.items.length - 1;

    popup_points.add_item(
        false,
        true,
        fruits[fruit_1_id].score_value,
        merge_animation.items[merge_last_id].position_X,
        merge_animation.items[merge_last_id].position_Y,
    );



    if (fruit_1_id !== fruits_count - 1) { // если фрукты не кокосы.

        let last_id = fruits[fruit_1_id + 1].items.length;

        fruits[fruit_1_id + 1].items[last_id] = fruits[fruit_1_id].items[fruit_1_item_id];

        fruits[fruit_1_id + 1].items[last_id].body.mass = fruits[fruit_1_id + 1].mass;
        fruits[fruit_1_id + 1].items[last_id].shape.radius = fruits[fruit_1_id + 1].radius;
        fruits[fruit_1_id + 1].items[last_id].image_radius = fruits[fruit_1_id + 1].radius;

        fruits[fruit_1_id].items.splice(fruit_1_item_id, 1);

        // немного замедляем первый фрукт после мерджа.
        world.getBodyById(body_1_id).velocity[0] /= 2;
        world.getBodyById(body_1_id).velocity[1] /= 2;

        // удаление второго фрукта.
        fruit_2_id = get_info_about_gameObject_by_idBody(body_2_id).id;
        fruit_2_item_id = get_idItem_by_idBody(body_2_id);
        delete_body_fruit(fruits[fruit_2_id].items[fruit_2_item_id].body);

        if (selectedFruit.body_id === body_1_id || selectedFruit.body_id === body_2_id) {
            selectedFruit.body_id = body_1_id;
        }

        // останавливаем фрукт перед прыжком вверх, чтобы он прыгал вверх всегда на одну высоту.
        world.getBodyById(body_1_id).velocity[0] = 0;
        world.getBodyById(body_1_id).velocity[1] = 0;

        // Подкидывает вверх и немного в сторону фрукт после мерджа.
        push_object.apply_force(
            body_1_id,
            get_random_float(Math.PI * 0.45, Math.PI * 0.55),
            fruits[fruit_1_id + 1].mass * 3, // 3.5
            false
        );


    } else { // если оба фрукта кокосы.
        // удаляем оба фрукта.
        let fruit_1_id = get_info_about_gameObject_by_idBody(body_1_id).id;
        let fruit_1_item_id = get_idItem_by_idBody(body_1_id);
        delete_body_fruit(fruits[fruit_1_id].items[fruit_1_item_id].body);

        let fruit_2_id = get_info_about_gameObject_by_idBody(body_2_id).id;
        let fruit_2_item_id = get_idItem_by_idBody(body_2_id);
        delete_body_fruit(fruits[fruit_2_id].items[fruit_2_item_id].body);

        // запускаем финальную анимацию показа сердечек.
        setTimeout(() => {
            show_final_hearts();
        }, 2500);

        selectedFruit.body_id = -1;
    }

    push_object.is_pressed_leftMouse = false;

    //check_balance_game();

    stars.counter_merges++;

    if (stars.counter_merges >= stars.count_merges_for_star) {

        popup_points.add_item(
            true,
            true,
            1,
            merge_animation.items[merge_last_id].position_X,
            merge_animation.items[merge_last_id].position_Y,
        );

        stars.counter_merges = 0;
    }
}


function get_idItem_by_idBody(id_body) { // получает id в fruits[] по id body.
    for (let i = 0; i < fruits_count; i++) {
        for (let j = 0; j < fruits[i].items.length; j++) {

            if (fruits[i].items[j].body.id === id_body) {
                return j;
            }

        }
    }
}



function delete_body_fruit(body) {  // удаляет тело из мира.
    let id_fruit = get_info_about_gameObject_by_idBody(body.id).id;
    let id_item = get_idItem_by_idBody(body.id);

    world.removeBody(body);

    fruits[id_fruit].items.splice(id_item, 1);
}


// проверка баланса игры, например чтобы не было ситуаций когда не будет ни одной пары фруктов для мерджа.
function check_balance_game() {

    // поиск дублей.
    let doubles_count;

    do {
        doubles_count = 0;

        for (let i = 0; i < fruits_count; i++) {
            doubles_count += Math.trunc(fruits[i].items.length / 2);
        }

        if (doubles_count < 3) {
            add_new_fruit();
        }

    } while (doubles_count < 3)
}

// добавляет новую малинку на игровое поле.
function add_new_fruit() {

    let radius = fruits[0].radius;
    let position = get_free_XY_in_gameField(game_objects.FRUIT, radius);

    fruits[0].items.push({
        body: new p2.Body({
            mass: fruits[0].mass,
            position: [position[0], position[1]],
            angularVelocity: get_random_float(angularVelocity_min, angularVelocity_max),
        }),
        shape: new p2.Circle({ radius: radius }),
        image_radius: fruits[0].radius, // радиус для картинки
        // первый ли сейчас кадр. (нужно для того чтобы при создании фрукта его на первом кадре не отрисовывало на нулевых координатах)
        limit_frames: limit_frames,
    });

    let last_id = fruits[0].items.length - 1;

    fruits[0].items[last_id].body.addShape(fruits[0].items[last_id].shape);
    world.addBody(fruits[0].items[last_id].body);

    //fruits[0].items[last_id].body.invMass = 1;

    // делаем вспышку от появления нового фрукта.
    /* let id_body = fruits[0].items[last_id].body.id;
    spray_of_stars_on_new_fruit.add(id_body); */
}



function window_resize() { // что происходит когда игрок меняет размеры окна браузера.

    //console.log('window_resize --- ', performance.now());

    pause_game(false);

    update_canvas_gameField_scale();


    let x, y;
    let _size;
    let position = [];
    let font_size;
    let height;
    let text_shadow;

    // HUD.
    let HUD = document.getElementById('HUD');
    HUD.style.width = gameField.width / window.devicePixelRatio + 'px';
    HUD.style.height = gameField.width * 0.2 / window.devicePixelRatio + 'px';
    HUD.style.top = '0px';


    _size = gameField.width * 0.175;

    let HUD_width = gameField.width / window.devicePixelRatio;
    let HUD_height = gameField.height / window.devicePixelRatio * gameField.ratio_height_of_HUD_to_height_of_gameField;
    let offset = (canvas_gameField.width - gameField.width) / 2 / window.devicePixelRatio;

    // icon settings.
    let icon_settings = document.getElementById('settings');
    height = HUD_width * 0.11;
    icon_settings.style.height = height + 'px';


    // счётчик звёзд. 
    document.getElementById('star_container').style.fontSize = HUD_width * 0.04 + 'px';


    // иконка share.
    let share_icon = document.getElementById('share');
    share_icon.style.display = 'flex';
    height = HUD_width * 0.1;
    share_icon.style.height = height + 'px';

    // leaderboard.
    let leaderboard = document.getElementById('leaderboard');
    leaderboard.style.display = 'flex';
    leaderboard.style.width = gameField.width * 0.155 / window.devicePixelRatio + 'px';


    // score.
    document.getElementById('score_best_value_container').style.fontSize = HUD_width * 0.05 + 'px';
    document.getElementById('score_current_container').style.fontSize = HUD_width * 0.08 + 'px';
    document.getElementById('scores_img_crown').style.width = HUD_width * 0.07 + 'px';



    // летающие очки.
    scores.flying_font_size = 1.3;

    refresh_sizes_of_prev_message_fullScreen_ads();

    stars.init();

    stars.button_delete_fruit.refresh();

    scores.init();

    popup_points.init();


    red_line.refresh();



    gameField.border.set_color();

    gameField.border.radius = fruits[0].radius * scale_X * 1.1;
    gameField.border.line_width = scale_X * 0.15;

    draw_gameField();

    // Обновляем размеры и координаты у стенок gameField.
    x = canvas_gameField.width / 2;
    y = gameField.centerY - (gameField.height / 2);
    position = get_physicCoords_from_canvasCoords(x, y);
    topPlaneBody.position = position;

    x = canvas_gameField.width / 2;
    y = gameField.centerY + (gameField.height / 2);
    position = get_physicCoords_from_canvasCoords(x, y);
    bottomPlaneBody.position = position;

    x = gameField.centerX - (gameField.width / 2);
    y = canvas_gameField.height / 2;
    position = get_physicCoords_from_canvasCoords(x, y);
    leftPlaneBody.position = position;

    x = gameField.centerX + (gameField.width / 2);
    y = canvas_gameField.height / 2;
    position = get_physicCoords_from_canvasCoords(x, y);
    rightPlaneBody.position = position;

    draw_HUD();

    refresh_window_settings();

    if (!is_testing) {
        if (platform === platforms.YANDEX_GAMES) {
            // отключаем показ кнопки leaderboard.
            document.getElementById('leaderboard').style.display = 'none';
            // отключаем показ кнопки share.
            document.getElementById('share').style.display = 'none';
        }
    }
}





// перерисовывает весь HUD.
function draw_HUD() {

    // очищаем канвас HUD.
    ctx_HUD.clearRect(0, 0, canvas_fruits.width, canvas_fruits.height);

    //sounds.draw_icons();
}


function update_canvas_gameField_scale() { // пересчитываем canvas, gameField и scale.

    let width = document.documentElement.clientWidth || window.innerWidth;
    let height = document.documentElement.clientHeight || window.innerHeight;

    document.getElementById('canvas_wrapper').width = width;
    document.getElementById('canvas_wrapper').style.width = width + 'px';
    document.getElementById('canvas_wrapper').height = height;
    document.getElementById('canvas_wrapper').style.height = height + 'px';


    canvas_gameField.width = width * window.devicePixelRatio;
    canvas_gameField.style.width = width + 'px';

    canvas_gameField.height = height * window.devicePixelRatio;
    canvas_gameField.style.height = height + 'px';


    canvas_HUD.width = canvas_gameField.width;
    canvas_HUD.style.width = width + 'px';
    canvas_HUD.height = canvas_gameField.height;
    canvas_HUD.style.height = height + 'px';


    canvas_fruits.width = canvas_gameField.width;
    canvas_fruits.style.width = width + 'px';
    canvas_fruits.height = canvas_gameField.height;
    canvas_fruits.style.height = height + 'px';



    gameField.height = canvas_gameField.height / (1 + gameField.ratio_offset_to_height_of_gameField);
    gameField.offset = canvas_gameField.height - gameField.height;
    gameField.width = gameField.height * gameField.ratio_width_to_height_of_gameField;

    // если экран по ширине узковат для gameField.
    if (gameField.width + gameField.offset * 2 > canvas_gameField.width) {

        let ratio = gameField.ratio_offset_to_height_of_gameField / gameField.ratio_width_to_height_of_gameField;
        gameField.width = canvas_gameField.width / (1 + ratio * 2);
        gameField.offset = (canvas_gameField.width - gameField.width) / 2;
        gameField.height = gameField.width / gameField.ratio_width_to_height_of_gameField;
    }

    gameField.centerX = canvas_gameField.width / 2;
    gameField.centerY = gameField.height / 2;


    // ставим число в корне, чтобы когда площадь gameField стала в 2 раза больше, нужно чтобы радиус фрукта не в 2 раза увеличился, а то его площадь увеличится аж в 4 раза, 2 умножить на 2. Поэтому в корне надо делать.
    //let scale = gameField.width / 1; // 20
    //scale = gameField.width * 0.005;

    scale = gameField.width / gameField.width_in_meters;

    scale_X = scale;
    scale_Y = -scale;

    //scale_objects = Math.sqrt(gameField.width * gameField.height) / scale / 20;
}




function create_planes_of_gameField() { // создаём стенки у gameField.
    let x, y;
    let position = [];

    // создаём стенки у gameField.
    x = canvas_gameField.width / 2;
    y = gameField.centerY - (gameField.height / 2);
    position = get_physicCoords_from_canvasCoords(x, y);
    topPlaneBody = new p2.Body({
        position: position,
        angle: Math.PI
    });
    topPlaneBody.addShape(new p2.Plane());
    world.addBody(topPlaneBody);

    x = canvas_gameField.width / 2;
    y = gameField.centerY + (gameField.height / 2);
    position = get_physicCoords_from_canvasCoords(x, y);
    bottomPlaneBody = new p2.Body({
        position: position,
    });
    bottomPlaneBody.addShape(new p2.Plane());
    world.addBody(bottomPlaneBody);

    x = gameField.centerX - (gameField.width / 2);
    y = canvas_gameField.height / 2;
    position = get_physicCoords_from_canvasCoords(x, y);
    leftPlaneBody = new p2.Body({
        position: position,
        angle: -Math.PI / 2
    });
    leftPlaneBody.addShape(new p2.Plane());
    world.addBody(leftPlaneBody);

    x = gameField.centerX + (gameField.width / 2);
    y = canvas_gameField.height / 2;
    position = get_physicCoords_from_canvasCoords(x, y);
    rightPlaneBody = new p2.Body({
        position: position,
        angle: Math.PI / 2
    });
    rightPlaneBody.addShape(new p2.Plane());
    world.addBody(rightPlaneBody);
}





// установка событий.
function set_events() {

    document.getElementById('canvas_wrapper').addEventListener('pointerdown', function (e) {
        // нажата ли ЛКМ.
        if (e.button === 0) {
            pointer.is_pressed = true;

            let x = e.clientX * window.devicePixelRatio;
            let y = e.clientY * window.devicePixelRatio;

            stars.button_delete_fruit.update(x, y);

            refresh_pointer_position(x, y);
        }
    });


    document.getElementById('canvas_wrapper').addEventListener('pointermove', function (e) {
        // ограничиваем частоту опросов на эту прослушку движения указателя. (а то по умолчанию в сек аж около 1000 раз)
        if (performance.now() - pointermove_time < 1000 / 60) return;
        else {
            pointermove_time = performance.now();
        }

        let x = e.clientX * window.devicePixelRatio;
        let y = e.clientY * window.devicePixelRatio;

        stars.button_delete_fruit.update(x, y);

        refresh_pointer_position(x, y);
    });


    document.getElementById('canvas_wrapper').addEventListener('pointerup', function (e) {
        pointer.is_pressed = false;

        if (!stars.button_delete_fruit.is_pressed) pointer.fruit.drop();

        // удаляем фрукт на который нажали.
        if (stars.button_delete_fruit.is_pressed && stars.button_delete_fruit.is_selected_fruit) {
            let fruit_id = stars.button_delete_fruit.selected_fruit_id;
            let item_id = stars.button_delete_fruit.selected_item_id;

            if (Math.floor(stars.value) - stars.button_delete_fruit.price > 0) {

                // вычитаем звёздочки из счётчика звёздочек и показываем на экране сколько вычли.
                popup_points.add_item(
                    true,
                    false,
                    stars.button_delete_fruit.price,
                    fruits[fruit_id].items[item_id].body.position[0],
                    fruits[fruit_id].items[item_id].body.position[1],
                );

                delete_body_fruit(fruits[fruit_id].items[item_id].body);

            } else { // если звёздочек не хватает для покупки удаления фрукта.

                // здесь надо показать красным вспышку на кнопке что нельзя купить удаление фрукта.

                stars.button_delete_fruit.popup_message(
                    fruits[fruit_id].items[item_id].body.position[0],
                    fruits[fruit_id].items[item_id].body.position[1]
                );

            }

            sound_push_fruit.play();
        }
    });





    // 🔒 Блокируем всплывающее меню, выделение и жесты по умолчанию
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('touchstart', e => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });


    // 🔒 Блокируем масштабирование колесом мыши с Ctrl/Cmd
    window.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
        }
    }, { passive: false });






    // при изменении размера окна игры.
    window.addEventListener("resize", () => {
        //console.log('resize --- ', performance.now());
        pause_game(false);
        save_settings_to_localStorage();
        window_resize();
        //refresh_settings_of_fruits();
        //update_sizes_all_objects();
        continue_game();
    });

    // когда фокус уходит с игры.
    window.addEventListener("blur", () => {
        //console.log('blur --- ', performance.now());
        pause_game(true);
        save_settings();
    });

    // когда игра возвращается в фокус.
    window.addEventListener("focus", () => {
        //console.log('focus --- ', performance.now());
        //refresh_settings_of_fruits();

        download_settings();

        if (!sounds.is_mute) Howler.mute(false);

        continue_game();
    });



    // событие конца анимации.
    /* star_counter_container.addEventListener('animationend', (event) => {
        star_counter_container.className = '';
    }); */



    // кнопка запуска FullScreen-рекламы появляющаяся в сообщении перед показом FullScreen-рекламы.
    document.getElementById('ads_message_button').addEventListener('click', () => {
        if (platform === platforms.GAME_PUSH) {
            gp.ads.showFullscreen();

            console.log('gp.ads.showFullscreen() --- ' + performance.now());
        }

        if (platform === platforms.YANDEX_GAMES) {
            ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: function () {
                        // Действие после открытия рекламы.
                        let text = 'Открылась FullScreen-реклама.';
                        console.log(text);
                    },
                    onClose: function (wasShown) {
                        // Действие после закрытия рекламы.
                        let text = 'Закрылась FullScreen-реклама.';
                        console.log(text);

                        is_playing_FullScreen_or_Rewarded = false;

                        continue_game();

                        document.getElementById('dark_layer_2').animate(
                            [
                                { opacity: 1 },
                                { opacity: 0, visibility: 'hidden' },
                            ],
                            {
                                fill: 'forwards',
                                duration: 300,
                            }
                        );

                        time_of_last_FullScreen_ads = performance.now();

                        stars.value += count_stars_after_FullScreen_ads;

                        setTimeout(() => {
                            show_popup_of_purchased_stars(count_stars_after_FullScreen_ads);
                        }, 300);
                    },
                    onError: function (error) {
                        // Действие в случае ошибки.
                        let text = 'Ошибка при открытии или закрытии FullScreen-рекламы.';
                        console.log(text);

                        is_playing_FullScreen_or_Rewarded = false;

                        continue_game();

                        document.getElementById('dark_layer_2').animate(
                            [
                                { opacity: 1 },
                                { opacity: 0, visibility: 'hidden' },
                            ],
                            {
                                fill: 'forwards',
                                duration: 300,
                            }
                        );

                        time_of_last_FullScreen_ads = performance.now();

                        show_popup_of_purchased_stars(count_stars_after_FullScreen_ads);
                    },
                }
            });
        }

        // убираем надпись и кнопку.
        document.getElementById('ads_message_button').className = '';
        document.getElementById('ads_message_button_img').className = '';
        document.getElementById('ads_message_container').style.visibility = 'hidden';
    });




    // icon_settings.
    let icon_settings = document.getElementById('settings');
    icon_settings.addEventListener('click', (event) => {

        sound_click.play();

        if (is_opened_window_settings) {
            close_window_settings();
        } else {
            open_window_settings();
        }

    });




    // leaderboard от GamePush.
    let leaderboard = document.getElementById('leaderboard');

    leaderboard.addEventListener('click', (event) => {

        if (is_paused) return;

        sound_click.play();

        setTimeout(() => {
            gp.leaderboard.open({
                // Сортировка по полям слева направо
                orderBy: ['score'],
                // Сортировка DESC — сначала большие значение, ASC — сначала маленькие
                order: 'DESC',
                // Количество игроков в списке
                limit: 10,
                // Включить список полей для отображения в таблице, помимо orderBy
                //includeFields: ['rank'],
                // Вывести только нужные поля по очереди
                //displayFields: ['rank', 'level'],
                /**
                 * Показывать ли текущего игрока в списке, если он не попал в топ
                 * none — не показывать
                 * first — показать первым
                 * last — показать последним
                 */
                withMe: 'first',
                // Показать N ближайших игроков сверху и снизу, максимум 10
                showNearest: 5,
            });
        }, 20);

        //leaderboard.classList.remove('flirting');
    });



    // share кнопка.
    let share = document.getElementById('share');

    share.addEventListener('click', (event) => {

        sound_click.play();

        gp.socials.post();
    });



    /* image_fruits.onload = function () {
        draw_HUD();
    };

    image_all.onload = function () {
        draw_HUD();
    }; */


    // кнопка X закрытия окна настроек.
    let window_settings_button_X = document.getElementById('window_settings_button_X');
    window_settings_button_X.addEventListener('click', (event) => {
        sound_click.play();
        close_window_settings();
    });

    sounds.set_events();

    stars.button_delete_fruit.init();

}


function init() {

    // Init p2.js
    world = new p2.World({
        gravity: [0, -9.82] // -9.82
    });

    // Pre-fill object pools. Completely optional but good for performance!
    world.overlapKeeper.recordPool.resize(16);
    /* world.islandManager.islandPool.resize(128);
    world.islandManager.nodePool.resize(1024); */
    world.narrowphase.contactEquationPool.resize(1024);
    world.narrowphase.frictionEquationPool.resize(1024);
    /* world.emitImpactEvent = false; */

    world.setGlobalRelaxation(3); // 5 / 1 // сила отскока от стенок gameField, чем меньше число, тем сильне отскакивает.
    world.setGlobalStiffness(20000); // 200 / 20000 // стенки gameField становятся режиновыми, от них фрукты пружинят. Чем больше число, тем твёрже стенки.

    /* 
    // Max number of solver iterations to do
    world.solver.iterations = 20; // 20 
    // Solver error tolerance
    world.solver.tolerance = 0.02; // 0.02

    // Set high friction so the wheels don't slip
    world.defaultContactMaterial.friction = 0.3; */


    document.getElementById('score_best').innerText = scores.value_best;
    document.getElementById('score_best_shadow').innerText = scores.value_best;

    document.getElementById('score_current').innerText = scores.value_current;
    document.getElementById('score_current_shadow').innerText = scores.value_current;


    update_canvas_gameField_scale();

    set_settings_fruits();

    //refresh_settings_of_fruits();

    gameField.border.change_color();

    create_planes_of_gameField();

    window_resize();

    pointer.init();



    // нужно для правильного высчитывания scale_of_fps нужного для высчитывания шагов в фитилях.
    /* setTimeout(() => {
        update_sizes_all_objects();
    }, 5000); */

    set_events();

    // Create a body for the cursor
    mouseBody = new p2.Body();
    world.addBody(mouseBody);

    /* setInterval(() => {
        merge_animation.add(
            0,
            0,
            0
        );
    }, 500); */

    test();
}


// корректируем размеры и смещение картинок фруктов визуально по центру физического кружка.
function scale_and_offset_images_of_fruits() {
    // выставляем цвета мерджей для каждого фрукта.
    // малина
    fruits[0].merge_color_1.color = '#FFE816CB'; // FFE816CB
    fruits[0].merge_color_1.proportion = 0.4;
    fruits[0].merge_color_2.color = '#FFE816CB'; // FFE816CB
    fruits[0].merge_color_2.proportion = 0.35;
    fruits[0].merge_color_3.color = '#FFE816CB'; // FFE816CB

    // лимон
    fruits[1].merge_color_1.color = '#46C70FC4'; // 50DB15E8
    fruits[1].merge_color_1.proportion = 0.2;
    fruits[1].merge_color_2.color = '#46C70FC4'; // 50DB15D0
    fruits[1].merge_color_2.proportion = 0.4;
    fruits[1].merge_color_3.color = '#46C70FC4'; // 50DB15BE

    // яблоко
    fruits[2].merge_color_1.color = '#FF2121D8'; // C80B0ECB
    fruits[2].merge_color_1.proportion = 0.1;
    fruits[2].merge_color_2.color = '#FF2121FF'; // FF1D21C0
    fruits[2].merge_color_2.proportion = 0.4;
    fruits[2].merge_color_3.color = '#FF2121FF'; // FF1D21C0

    // крубника
    fruits[3].merge_color_1.color = '#FF9900D8'; // FF8800B4
    fruits[3].merge_color_1.proportion = 0.3;
    fruits[3].merge_color_2.color = '#FF9900D8'; // FFE600B7
    fruits[3].merge_color_2.proportion = 0.6;
    fruits[3].merge_color_3.color = '#FF9900D8'; // FF9F21C5

    // апельсин
    fruits[4].merge_color_1.color = '#59BC03DE'; // 82D605CB
    fruits[4].merge_color_1.proportion = 0.3;
    fruits[4].merge_color_2.color = '#59BC03DE'; // 59BC03C7
    fruits[4].merge_color_2.proportion = 0.5;
    fruits[4].merge_color_3.color = '#59BC03DE'; // 017C01C2

    // арбуз
    fruits[5].merge_color_1.color = '#F8FF3CCE'; // FFEE00C4
    fruits[5].merge_color_1.proportion = 0.6;
    fruits[5].merge_color_2.color = '#F8FF3CCE'; // F8FF3CC2
    fruits[5].merge_color_2.proportion = 0.3;
    fruits[5].merge_color_3.color = '#F8FF3CCE'; // FFAB0ECB

    // ананас
    fruits[6].merge_color_1.color = '#D8D8D8C4'; // 424242C2
    fruits[6].merge_color_1.proportion = 0.6;
    fruits[6].merge_color_2.color = '#D8D8D8C4'; // ADADADC0
    fruits[6].merge_color_2.proportion = 0.35;
    fruits[6].merge_color_3.color = '#D8D8D8C4'; // D8D8D8BB

    // ежевика
    fruits[7].merge_color_1.color = '#80FF2CC0'; // 74E700C2
    fruits[7].merge_color_1.proportion = 0.3;
    fruits[7].merge_color_2.color = '#80FF2CC0'; // 80FF2CC0
    fruits[7].merge_color_2.proportion = 0.2;
    fruits[7].merge_color_3.color = '#80FF2CC0'; // 636363B9

    // киви
    fruits[8].merge_color_1.color = '#FFE816FF'; // FFCC00C4
    fruits[8].merge_color_1.proportion = 0.3;
    fruits[8].merge_color_2.color = '#FFE816C9'; // FFD813CB
    fruits[8].merge_color_2.proportion = 0.4;
    fruits[8].merge_color_3.color = '#FFE816B6'; // FFE816C9

    // банан
    fruits[9].merge_color_1.color = '#AEFF17C9'; // D0FF7AC7
    fruits[9].merge_color_1.proportion = 0.4;
    fruits[9].merge_color_2.color = '#AEFF17C9'; // AEFF17C9
    fruits[9].merge_color_2.proportion = 0.2;
    fruits[9].merge_color_3.color = '#AEFF17C9'; // 94E400C7

    // белый виноград
    fruits[10].merge_color_1.color = '#FFAA00C7'; // FFAA00C7
    fruits[10].merge_color_1.proportion = 0.5;
    fruits[10].merge_color_2.color = '#FFAA00C7'; // FFBD3ABE
    fruits[10].merge_color_2.proportion = 0.3;
    fruits[10].merge_color_3.color = '#FFAA00C7'; // FFDA95C7

    // персик
    fruits[11].merge_color_1.color = '#F9FF3EC2'; // C0C52FC7
    fruits[11].merge_color_1.proportion = 0.4;
    fruits[11].merge_color_2.color = '#F9FF3EC2'; // F9FF3EC2
    fruits[11].merge_color_2.proportion = 0.3;
    fruits[11].merge_color_3.color = '#F9FF3EC2'; // E4EC00C0

    // груша
    fruits[12].merge_color_1.color = '#B5B6FFA6'; // 202294AB
    fruits[12].merge_color_1.proportion = 0.2;
    fruits[12].merge_color_2.color = '#B5B6FFA6'; // 5456C4A2
    fruits[12].merge_color_2.proportion = 0.3;
    fruits[12].merge_color_3.color = '#B5B6FFA6'; // B5B6FFA6

    // чёрный виноград
    fruits[13].merge_color_1.color = '#FFFFFFBE'; // FFFFFFBE
    fruits[13].merge_color_1.proportion = 0.2;
    fruits[13].merge_color_2.color = '#FFFFFFBE'; // CACACAB7
    fruits[13].merge_color_2.proportion = 0.3;
    fruits[13].merge_color_3.color = '#FFFFFFBE'; // AC6D3CB6

    // кокос
    fruits[14].merge_color_1.color = '#FFFFFFBE'; // FFFFFFBE
    fruits[14].merge_color_1.proportion = 0.5;
    fruits[14].merge_color_2.color = '#FFFFFFBE'; // CACACAB7
    fruits[14].merge_color_2.proportion = 0.3;
    fruits[14].merge_color_3.color = '#FFFFFFBE'; // AC6D3CB6







    // малина
    fruits[0].image_scale = 1.05;
    fruits[0].image_offset_x = 1.03;
    fruits[0].image_offset_y = 1.09;

    // лимон
    fruits[1].image_scale = 1.18;
    fruits[1].image_offset_x = 1.07;
    fruits[1].image_offset_y = 1.19;

    // яблоко
    fruits[2].image_scale = 1.13;
    fruits[2].image_offset_x = 1.1;
    fruits[2].image_offset_y = 1.2;

    // крубника
    fruits[3].image_scale = 1.17;
    fruits[3].image_offset_x = 0.96;
    fruits[3].image_offset_y = 1.4;

    // апельсин
    fruits[4].image_scale = 1.13;
    fruits[4].image_offset_x = 1.1;
    fruits[4].image_offset_y = 1.13;

    // арбуз
    fruits[5].image_scale = 1.11;
    fruits[5].image_offset_x = 1.1;
    fruits[5].image_offset_y = 1.1;

    // ананас
    fruits[6].image_scale = 1.06;
    fruits[6].image_offset_x = 2.6;
    fruits[6].image_offset_y = 1.02;

    // ежевика
    fruits[7].image_scale = 1.22;
    fruits[7].image_offset_x = 1.06;
    fruits[7].image_offset_y = 1.31;

    // киви
    fruits[8].image_scale = 1.17;
    fruits[8].image_offset_x = 1.14;
    fruits[8].image_offset_y = 1.01;

    // банан
    fruits[9].image_scale = 1.05;
    fruits[9].image_offset_x = 1.085;
    fruits[9].image_offset_y = 1.05;

    // белый виноград
    fruits[10].image_scale = 1.22;
    fruits[10].image_offset_x = 0.95;
    fruits[10].image_offset_y = 1.3;

    // персик
    fruits[11].image_scale = 1.26;
    fruits[11].image_offset_x = 1.37;
    fruits[11].image_offset_y = 1.4;

    // груша
    fruits[12].image_scale = 1.45;
    fruits[12].image_offset_x = 1.78;
    fruits[12].image_offset_y = 1.71;

    // чёрный виноград
    fruits[13].image_scale = 1.14;
    fruits[13].image_offset_x = 1.03;
    fruits[13].image_offset_y = 1.2;

    // кокос
    fruits[14].image_scale = 1.16;
    fruits[14].image_offset_x = 1.15;
    fruits[14].image_offset_y = 1.15;
}



function get_free_XY_in_gameField(game_object, radius) { // находит свободное место куда можно вместить фрукт.

    let x, y;

    let max_tries = 100; // максимальное количество попыток для нахождения пустого места.
    let radius_in_pixels = radius * scale_X; // переводим радиус из физических координат в пиксели.

    loop1: for (let k = 1; k <= max_tries; k++) {

        let width = gameField.width;
        let x_left = gameField.centerX - (gameField.width / 2) + radius_in_pixels;
        let x_right = x_left + width - radius_in_pixels * 2;
        x = get_random_float(x_left, x_right);

        let height = gameField.height;
        let y_top = gameField.centerY - (gameField.height / 2) + radius_in_pixels;
        let y_bottom = y_top + height - radius_in_pixels * 2;
        y = get_random_float(y_top, y_bottom);

        let position = get_physicCoords_from_canvasCoords(x, y);
        x = position[0];
        y = position[1];

        // поиск по фруктам.
        for (let i = 0; i < fruits_count; i++) {
            for (let j = 0; j < fruits[i].items.length; j++) {

                let fruit_X = fruits[i].items[j].body.position[0];
                let fruit_Y = fruits[i].items[j].body.position[1];
                let fruit_Radius = fruits[i].radius;

                let distance = get_distance_between_2_points(x, y, fruit_X, fruit_Y);

                if (distance < radius + fruit_Radius) {
                    continue loop1;
                }
            }
        }

        return [x, y];
    }
    return [x, y];
}


function get_distance_between_2_points(x1, y1, x2, y2) { // вычисляет дистанцию между двумя точками.
    let distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    return distance;
}





// Получает Physic-координаты из Canvas-координат.
function get_physicCoords_from_canvasCoords(x, y) {
    let rect = canvas_gameField.getBoundingClientRect();
    x -= rect.left;
    y -= rect.top;

    x = (x - canvas_gameField.width / 2) / scale_X;
    y = (y - canvas_gameField.height / 2) / scale_Y;

    return [x, y];
}


// Получает Canvas-координаты из Physic-координат.
function get_canvasCoords_from_physicCoords(x, y) {
    x = x * scale_X + canvas_gameField.width / 2;
    y = y * scale_Y + canvas_gameField.height / 2;

    return [x, y];
}



function draw_gameField() {
    let gameField_elem = document.getElementById('gameField');

    gameField_elem.style.width = gameField.width / window.devicePixelRatio + 'px';
    gameField_elem.style.height = gameField.height / window.devicePixelRatio + 'px';
    let offset_Y = (canvas_fruits.height / 2 - gameField.centerY) / window.devicePixelRatio;
    gameField_elem.style.marginBottom = offset_Y * 2 + 'px';
    gameField_elem.style.borderRadius = gameField.border.radius / window.devicePixelRatio + 'px';
}


// рисует окружность с заданными углами.
function draw_circle(ctx, x, y, radius, startAngle, endAngle, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(
        x,
        y,
        radius,
        startAngle,
        endAngle
    );
    ctx.fill();
}



function draw_fruits() {
    let x, y;
    let radius;

    for (let i = 0; i < fruits_count; i++) {
        for (let j = 0; j < fruits[i].items.length; j++) {

            let angle;

            // пропускаем первый кадр после создания фрукта, чтобы его не отрисовывало на нулевых координатах.
            if (fruits[i].items[j].limit_frames > 0) {
                fruits[i].items[j].limit_frames--;

                x = fruits[i].items[j].body.position[0];
                y = fruits[i].items[j].body.position[1];

                angle = fruits[i].items[j].body.angle;
                /* continue; */
            } else {
                x = fruits[i].items[j].body.interpolatedPosition[0];
                y = fruits[i].items[j].body.interpolatedPosition[1];

                angle = fruits[i].items[j].body.interpolatedAngle;
            }

            ctx_fruits.save();
            ctx_fruits.translate(x, y);
            ctx_fruits.rotate(angle);
            /* ctx_fruits.rotate(fruits[i].items[j].body.interpolatedAngle); */
            /* ctx_fruits.rotate(fruits[i].items[j].body.angle); */

            radius = fruits[i].items[j].image_radius;

            // делаем поправку для ананаса.
            let fruit_x, fruit_width;

            if (i >= 7) {
                fruit_x = (i + 1) * image_fruits.height;
            } else fruit_x = i * image_fruits.height;

            if (i === 6) fruit_width = image_fruits.height * 2;
            else fruit_width = image_fruits.height;


            //ctx_fruits.globalAlpha = 0.3;


            // подсвечиваем фрукт который хотим удалить.
            if (stars.button_delete_fruit.is_pressed && stars.button_delete_fruit.is_selected_fruit) {

                // на всякий случай проверяем действительно ли существует этот фрукт на поле.

                let fruit_id = stars.button_delete_fruit.selected_fruit_id;
                let item_id = stars.button_delete_fruit.selected_item_id;

                //console.log(fruit_id, item_id);

                if (item_id <= fruits[fruit_id].items.length - 1) {
                    if (i === fruit_id && j === item_id) {
                        ctx_fruits.filter = "brightness(0.3)";
                    }
                }
            }


            ctx_fruits.drawImage(
                image_fruits,
                fruit_x,
                0,
                fruit_width,
                image_fruits.height,
                -radius * fruits[i].image_offset_x,
                -radius * fruits[i].image_offset_y,
                radius * 2 * fruits[i].image_scale * (i === 6 ? 2 : 1),
                radius * 2 * fruits[i].image_scale,
            );


            //console.log(gameField.width.toFixed(0), radius.toFixed(0), (gameField.width / radius).toFixed(2));



            ctx_fruits.restore();

            // рисование кругов вокруг фруктов для отцентровки картинок.
            /* ctx_fruits.lineWidth = 0.9;
            ctx_fruits.strokeStyle = 'white';

            ctx_fruits.beginPath();
            ctx_fruits.arc(
                x,
                y,
                radius,
                0,
                2 * Math.PI,
            );
            ctx_fruits.stroke(); */
        }
    }

    //console.log(scale_X.toFixed(2), fruits[0].items[0].shape.radius.toFixed(2), (scale_X / fruits[0].items[0].shape.radius).toFixed(2));
}



function update() {

    // Clear the canvas
    ctx_fruits.clearRect(0, 0, canvas_fruits.width, canvas_fruits.height);

    // Transform the canvas
    ctx_fruits.save();
    ctx_fruits.translate(canvas_fruits.width / 2, canvas_fruits.height / 2); // Translate to the center
    ctx_fruits.scale(scale_X, scale_Y);


    //spray_of_stars_on_new_fruit.update();

    draw_fruits();
    pointer.draw();

    gameField.border.update();

    popup_points.update();

    merge_animation.update();

    red_line.update();

    ctx_fruits.restore();

    // проверяем сколько времени прошло с последнего запуска FullScreen-рекламы, если достаточно, то запускаем её снова.
    if (performance.now() - time_of_last_FullScreen_ads > FullScreen_ads_delay) {
        show_FullScreen_ads();
    }

    // обнуляем время простоя downtime (downtime - это длительность паузы).
    downtime = 0;
}



/* 
if (animation_id) {
    cancelAnimationFrame(animation_id);
} */




// Animation loop
function animation(current_time) {

    animation_id = requestAnimationFrame(animation);

    //delta_time = last_time ? (current_time - last_time) / 1000 : 0;
    delta_time = (current_time - last_time) / 1000;

    if (delta_time > 0.1) delta_time = 0.1;

    last_time = current_time;

    world.step(fixed_time_step, delta_time, max_sub_steps);

    scale_fps_calculate();

    // включает в центре экрана счётчик fps.
    //show_fps_counter();

    // своя функция проверки коллизии объектов.
    check_all_collisions();

    update();

}



// моя функция проверки возможных коллизий всех объектов.
function check_all_collisions() {

    // делаем небольшую задержку, а то в самом начале много касаний происходит видимо потому-что все объекты в нулевой точке друг на друге стоят.
    if (performance.now() < 1000) return;

    // проверка касаний одинаковых фруктов.
    for (let i1 = 0; i1 < fruits_count; i1++) {
        let radius_1 = fruits[i1].radius;

        for (let j1 = 0; j1 < fruits[i1].items.length; j1++) {

            let x1 = fruits[i1].items[j1].body.position[0];
            let y1 = fruits[i1].items[j1].body.position[1];

            for (let i2 = 0; i2 < fruits_count; i2++) {
                let radius_2 = fruits[i2].radius;

                for (let j2 = 0; j2 < fruits[i2].items.length; j2++) {

                    if (fruits[i1].items[j1].body.id === fruits[i2].items[j2].body.id || i1 !== i2) continue;

                    let x2 = fruits[i2].items[j2].body.position[0];
                    let y2 = fruits[i2].items[j2].body.position[1];

                    let distance = get_distance_between_2_points(
                        x1,
                        y1,
                        x2,
                        y2
                    );

                    let correction = 1.0;

                    if (distance <= (radius_1 + radius_2) * correction) {

                        check_collision(
                            fruits[i1].items[j1].body.id,
                            fruits[i2].items[j2].body.id
                        );

                        return;
                    }
                }
            }
        }
    }
}




window.addEventListener("keydown", (event) => {
    let k = event.keyCode;
    setTimeout(async () => {
        if (k === 49) { // 1

            //console.log(Object.keys(gameField));
            //show_FullScreen_ads();


            // удаляем все фрукты с поля.
            for (let i = 0; i < fruits_count; i++) {
                for (let j = fruits[i].items.length - 1; j >= 0; j--) {
                    delete_body_fruit(fruits[i].items[j].body);
                }
            }






        } else if (k === 50) { // 2


            show_FullScreen_ads();


            /* document.getElementById('leaderboard').style.display = 'none';
            document.getElementById('share').style.display = 'none'; */


            //scores.value_current = 2347928734;



            //change_game_mode(types_of_rewarded.GAMEMODE_BOOST);

            //show_popup_of_purchased_stars(FullScreen_ads_gift_stars_count);



        } else if (k === 51) { // 3





            // удаляем все фрукты с поля.
            if (fruits.length > 0) {
                for (let i = 0; i < fruits_count; i++) {
                    for (let j = fruits[i].items.length - 1; j >= 0; j--) {
                        delete_body_fruit(fruits[i].items[j].body);
                    }
                }
            }

            fruits = [];
            set_settings_fruits();

            // заново добавляем все сохранённые в localSrorage фрукты на поле.
            for (let i = 0; i < fruits_count; i++) {
                // добавляем в мир все фрукты одного и того же вида.
                let radius = fruits[i].radius;
                let position = get_physicCoords_from_canvasCoords(0, 0);

                fruits[i].items.push({
                    body: new p2.Body({
                        mass: fruits[i].mass,
                        position: [position[0], position[1]],
                        //angularVelocity: get_random_float(angularVelocity_min, angularVelocity_max),
                        angle: 0,
                        //angularDamping: 0.5,
                    }),
                    shape: new p2.Circle({
                        radius: radius,
                    }),
                    image_radius: radius, // радиус для картинки
                    limit_frames: limit_frames, // первый ли сейчас кадр. (нужно для того чтобы при создании фрукта его на первых кадрах не отрисовывало на нулевых координатах)
                });

                let last = fruits[i].items.length - 1;

                fruits[i].items[last].body.addShape(fruits[i].items[last].shape);
                world.addBody(fruits[i].items[last].body);
            }




            //console.log(typeof a);

            //if (Number.isFinite(a)) alert('Число');
            //else alert('Не число');


            //change_game_mode(types_of_rewarded.GAMEMODE_GRAVITY);

            //console.log(ysdk.deviceInfo);

            //training_stars.show_popup();



        } else if (k === 52) { // 4



            // удаляем все фрукты с поля.
            if (fruits.length > 0) {
                for (let i = 0; i < fruits_count; i++) {
                    for (let j = fruits[i].items.length - 1; j >= 0; j--) {
                        delete_body_fruit(fruits[i].items[j].body);
                    }
                }
            }

            fruits = [];
            set_settings_fruits();



            //show_popup_of_purchased_stars(0);

            //console.log(gp.payments.isAvailable);


            //gp.payments.fetchProducts();
            //console.log(gp.payments.purchases);


        } else if (k === 53) { // 5






            //a.style.transform = 'translate(-50%, -50%)';


            //console.log(ysdk.deviceInfo.isMobile());

            //gp.payments.purchase({ tag: stars.in_app_1_id });
            //gp.payments.purchase({});


        } else if (k === 54) { // 6





            //gp.payments.consume({ tag: 'STARS_9000' });

            //console.log(ysdk.deviceInfo.type);


        } else if (k === 55) { // 7



        } else if (k === 27) { // ESC


        }
    }, 1);
});





// добавляет новые всплывающие добавленные или вычтенные очки.
function add_new_popup_points(position_X, position_Y, is_add, value) {

    let duration = 3500; // продолжительность полёта очков.

    let points = document.createElement('div');

    document.body.append(points);

    if (is_add) {
        points.innerText = '+ ' + value;
        points.style.color = scores.plus_color;
    } else {
        points.innerText = '- ' + value;
        points.style.color = scores.plus_color;
        //points.style.color = score.minus_color;
    }

    points.style.left = position_X + 'px';
    points.style.top = position_Y + 'px';

    let scale = document.getElementById('settings').getBoundingClientRect().width;

    scale = parseFloat(scale);

    let fontSize = scale * 0.28;

    points.style.fontSize = fontSize + 'px';
    points.style.fontFamily = 'Blogger_Sans-Bold, sans-serif';
    points.style.textShadow = fontSize * 0.05 + 'px ' + fontSize * 0.1 + 'px ' + fontSize * 0.1 + 'px #000000FF';
    points.style.position = 'absolute';
    points.style.zIndex = 500;
    points.style.pointerEvents = 'none';
    points.style.textAlign = 'center';
    points.style.translate = '-50% -50%';

    points.animate(
        [
            { transform: 'translateY(0px)' },
            { transform: 'translateY(-' + scale * 2.7 + 'px)' },
        ],
        {
            fill: 'forwards',
            //easing: "ease-in-out",
            duration: 8000,
        },
    );

    setTimeout(() => {
        points.remove();
    }, duration);
}




function pause_game(mute) { // mute true - значит нужно поставить игру на паузу и отключить звуки.

    //console.log('pause_game --- ', performance.now());

    //save_settings_to_localStorage();

    is_paused = true;
    cancelAnimationFrame(animation_id);
    animation_id = null;

    time_pause = performance.now();

    if (mute) {
        Howler.mute(true);
    }

    if (!is_testing) {
        if (platform === platforms.GAME_PUSH) {
            gp.gameplayStop();
        }

        // Сообщаем Яндексу об остановке геймплея.
        if (platform === platforms.YANDEX_GAMES) {
            ysdk.features.GameplayAPI?.stop();
            //console.log('ysdk.features.GameplayAPI?.stop() --- ' + performance.now());
        }
    }
}


function continue_game() {

    //console.log('is_paused = ', is_paused);

    if (animation_id ||
        !is_paused ||
        is_opened_window_stars ||
        is_playing_FullScreen_or_Rewarded
    ) return;

    is_paused = false;
    if (!sounds.is_mute) Howler.mute(false);

    time_correction();

    last_time = performance.now();
    animation_id = requestAnimationFrame(animation);


    if (!is_testing) {
        if (platform === platforms.GAME_PUSH) {
            gp.gameplayStart();
        }

        // Сообщаем Яндексу о старте геймплея.
        if (platform === platforms.YANDEX_GAMES) {
            ysdk.features.GameplayAPI?.start();
            //console.log('ysdk.features.GameplayAPI?.start() --- ' + performance.now());
        }
    }
}




// корректировка времени. т.е. учитывание времени простоя игры во время паузы.
function time_correction() {
    downtime = performance.now() - time_pause;

    time_of_last_FullScreen_ads += downtime;
}



// корректировка переменной fps_correction для правильного подборка скорости объектов на разных герцовках экрана.
function scale_fps_calculate() {
    scale_of_fps = (1 / fps) / delta_time;
    if (scale_of_fps === Infinity) scale_of_fps = 1;
}


function show_fps_counter() {
    let fps_current = Math.round(fps * scale_of_fps);

    if (performance.now() - last_time_last_second >= 1000) {
        last_time_last_second = performance.now();
        document.getElementById('fps_counter').innerText = 'FPS: ' + Math.round(sum_of_fps / counter_of_frames);
        sum_of_fps = 0;
        counter_of_frames = 0;
    } else {
        sum_of_fps += fps_current;
        counter_of_frames++;
    }
}




// получает имя браузера.
function getBrowserName(userAgent) {
    if (userAgent.includes("Firefox")) {
        // "Mozilla/5.0 (X11; Linux i686; rv:104.0) Gecko/20100101 Firefox/104.0"
        return "Mozilla Firefox";
    } else return '';
}



// открывает окно настроек.
function open_window_settings() {

    let window_settings_background = document.getElementById('window_settings_background');

    window_settings_background.style.display = 'flex';

    let delay = 300;

    pause_game(false);

    refresh_window_settings();

    is_opened_window_settings = true;

    document.getElementById('settings').style.zIndex = 1000;
    setTimeout(() => {
        document.getElementById('settings').style.zIndex = 401;
    }, delay);

    window_settings_background.animate(
        [
            { opacity: 0 },
            { opacity: 1, visibility: 'visible' },
        ],
        {
            fill: 'forwards',
            duration: delay,
        }
    );

    document.getElementById('window_settings').animate(
        [
            { transform: `translate(${window_settings_offset_X}px, ${window_settings_offset_Y}px) scale(0.1)` },
            { transform: 'scale(1)' },
        ],
        {
            fill: 'forwards',
            duration: delay,
        },
    );
}


function close_window_settings() {

    save_settings();

    let delay = 300;

    is_opened_window_settings = false;

    continue_game();

    document.getElementById('window_settings_background').animate(
        [
            { opacity: 1 },
            /* { opacity: 1 }, */
            { opacity: 0, visibility: 'hidden' },
        ],
        {
            fill: 'forwards',
            duration: delay,
        }
    );

    let window_settings = document.getElementById('window_settings');

    window_settings.animate(
        [
            { transform: 'scale(1)', offset: 0 },
            { transform: `translate(${window_settings_offset_X}px, ${window_settings_offset_Y}px) scale(0.1)`, offset: 1 },
            { transform: 'scale(1)', offset: 1 },
        ],
        {
            fill: 'forwards',
            duration: delay,
        },
    );
}




// обновляет окно настроек.
function refresh_window_settings() {

    let scale;

    if (gameField.width > gameField.height) scale = gameField.height / window.devicePixelRatio * 0.0015;
    else scale = gameField.width / window.devicePixelRatio * 0.002;

    let window_settings = document.getElementById('window_settings');
    window_settings.style.padding = scale * 15 + 'px';
    window_settings.style.outlineWidth = scale * 2 + 'px';
    window_settings.style.outlineOffset = scale * 6 + 'px';
    window_settings.style.fontSize = scale * 24 + 'px';
    window_settings.style.borderRadius = scale * 15 + 'px';



    let window_settings_title = document.getElementById('window_settings_title');
    let window_settings_title_shadow = document.getElementById('window_settings_title_shadow');
    let window_settings_title_text = document.getElementById('window_settings_title_text');
    window_settings_title.style.fontSize = scale * 38 + 'px';
    window_settings_title.style.marginBottom = scale * 10 + 'px';
    window_settings_title_shadow.style.webkitTextStrokeWidth = scale * 5 + 'px';

    let block_border_width = 4;

    let window_settings_sounds = document.getElementById('window_settings_sounds');
    window_settings_sounds.style.padding = scale * 15 + 'px';
    window_settings_sounds.style.gap = scale * 12 + 'px';
    window_settings_sounds.style.borderRadius = scale * 15 + 'px';
    window_settings_sounds.style.borderWidth = scale * block_border_width + 'px';
    window_settings_sounds.style.marginTop = scale * 7 + 'px';

    let window_settings_sounds_img = document.getElementById('window_settings_sounds_img');
    window_settings_sounds_img.style.width = scale * 50 + 'px';
    window_settings_sounds_img.style.height = scale * 50 + 'px';

    let window_settings_sounds_container_text = document.getElementById('window_settings_sounds_container_text');
    window_settings_sounds_container_text.style.margin = '0px';
    window_settings_sounds_container_text.style.textShadow = scale * 1 + 'px ' + scale * 2 + 'px ' + scale * 2 + 'px black';

    let window_settings_sounds_container_range = document.getElementById('window_settings_sounds_container_range');
    window_settings_sounds_container_range.style.width = scale * 195 + 'px';

    let window_settings_button_X_circle = document.getElementById('window_settings_button_X_circle');
    let button_X_size = 60;
    window_settings_button_X_circle.style.width = scale * button_X_size + 'px';
    window_settings_button_X_circle.style.height = scale * button_X_size + 'px';
    window_settings_button_X_circle.style.borderWidth = scale * button_X_size * 0.04 + 'px';
    window_settings_button_X_circle.style.boxShadow = '0px 2px ' + scale * button_X_size * 0.1 + 'px black';

    let window_settings_button_X_symbol = document.getElementById('window_settings_button_X_symbol');
    let font_size = scale * button_X_size * 1.447;
    window_settings_button_X_symbol.style.fontSize = font_size + 'px';


    if (canvas_gameField.width > canvas_gameField.height) { // горизонтальная ориентация.
        window_settings_button_X_symbol.style.marginTop = -font_size * 0.005 + 'px';
    } else { // вертикальная ориентация.
        window_settings_button_X_symbol.style.marginTop = font_size * 0.15 + 'px';
    }


    if (language === languages.RU) {
        let text_1 = 'НАСТРОЙКИ';
        window_settings_title_shadow.innerText = text_1;
        window_settings_title_text.innerText = text_1;
        window_settings_sounds_container_text.innerText = 'Громкость звуков';
    } else {
        let text_1 = 'SETTINGS';
        window_settings_title_shadow.innerText = text_1;
        window_settings_title_text.innerText = text_1;
        window_settings_sounds_container_text.innerText = 'Volume of sounds';
    }

    let sizes = window_settings.getBoundingClientRect();

    let window_width = sizes.width;
    let window_height = sizes.height;


    let HUD_height = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField / window.devicePixelRatio;

    let window_left = (canvas_HUD.width / 2 / window.devicePixelRatio - window_width / 2);
    let window_top = (HUD_height + (gameField.height / window.devicePixelRatio - HUD_height) / 2 - window_height / 2);

    window_settings.style.left = window_left + 'px';
    window_settings.style.top = window_top + 'px';


    let icon_settings = document.getElementById('settings');

    let icon_sizes = icon_settings.getBoundingClientRect();

    window_settings_offset_X = (icon_sizes.left + icon_sizes.width / 2) - (window_left + window_width / 2);
    window_settings_offset_Y = (icon_sizes.top + icon_sizes.height / 2) - (window_top + window_height / 2);
}








// клик по иконке rewarded.
function rewarded_click() {

    sound_click.play();

    if (platform === platforms.GAME_PUSH) {

        if (gp.ads.isRewardedAvailable) {
            gp.ads.showRewardedVideo({ showCountdownOverlay: true });
        }
    }



    if (platform === platforms.YANDEX_GAMES) {

        ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    // Вызывается при отображении видеорекламы на экране.
                    console.log('Rewarded-реклама открыта.');

                    is_playing_FullScreen_or_Rewarded = true;

                    pause_game(true);
                },
                onRewarded: () => {
                    // Вызывается, когда засчитывается просмотр видеорекламы. Укажите в данной функции, какую награду пользователь получит после просмотра.
                    console.log('Rewarded-реклама успешно просмотрена.');

                    stars.value += stars.rewarded_value;

                    // принудительно сохраняем в облако.
                    can_save_to_cloud = true;
                    save_settings();

                    setTimeout(() => {
                        show_popup_of_purchased_stars(stars.rewarded_value);
                    }, stars.delay_between_purchases / 3);

                },
                onClose: () => {
                    // Вызывается при закрытии видеорекламы.
                    console.log('Rewarded-реклама закрыта.');

                    is_playing_FullScreen_or_Rewarded = false;

                    if (!sounds.is_mute) Howler.mute(false);

                    continue_game();
                },
                onError: (e) => {
                    // Вызывается при возникновении ошибки. Объект ошибки передается в callback-функцию.
                    console.log('Ошибка при Rewarded-рекламе: ', e);
                }
            }
        })

    }
}




// всплывающее уведомление о приобретённых новых звёздочках после просмотра rewarded-видео или покупки за деньги.
function show_popup_of_purchased_stars(stars_count) {
    let window_popup = document.createElement('div');
    document.body.append(window_popup);
    window_popup.className = 'window_show_popup_of_purchased_stars';
    let center_X = gameField.centerX / window.devicePixelRatio;
    let center_Y = gameField.centerY / window.devicePixelRatio;
    window_popup.style.left = center_X + 'px';
    window_popup.style.top = center_Y + 'px';

    let size = Math.min(gameField.width, gameField.height) / window.devicePixelRatio;

    window_popup.style.padding = size * 0.07 + 'px ' + size * 0.15 + 'px';
    window_popup.style.borderRadius = size * 0.1 + 'px';
    window_popup.style.border = size * 0.008 + 'px solid #FFFFFFE1';
    window_popup.style.boxShadow = '0px 0px ' + size * 0.03 + 'px #FFFFFFFF';

    // text
    let text_container = document.createElement('div');
    window_popup.append(text_container);
    text_container.className = 'text_2_container';
    text_container.style.fontSize = size * 0.25 + 'px';

    let star = document.createElement('img');
    text_container.append(star);
    star.src = 'images/star.png';
    star.className = 'stars_counter_image_star';
    star.style.width = size * 0.1 + 'px';
    star.style.height = size * 0.1 + 'px';


    let font_size = size * 0.08;

    let value = document.createElement('div');
    text_container.append(value);
    value.style.fontSize = font_size + 'px';
    value.style.textShadow = `${font_size * 0.05}px ${font_size * 0.05}px ${font_size * 0.12}px rgba(0, 0, 0, 0.99)`;
    value.style.top = '50%';
    value.style.display = 'block';

    // смещаем немного вниз на телефоне, потому что она задирает вверх почему-то.
    if (canvas_gameField.height > canvas_gameField.width) value.style.marginTop = font_size * 0.12 * 0.25 + 'px';

    value.innerText = '+' + stars_count;

    let animation_1_duration = 600;
    let hold_duration = 300;
    let animation_2_duration = 800;

    let total_duration = animation_1_duration + hold_duration + animation_2_duration;


    setTimeout(() => {
        window_popup.remove();
        stars.add_value_to_starsCounter(stars_count);
    }, total_duration);


    window_popup.animate(
        [
            { transform: 'translate(0px, 100%) scale(0.1)', opacity: 0 },
            { transform: 'translate(0px, -30%) scale(1.2)', opacity: 1 },
            { transform: 'scale(1)' },
        ],
        {
            fill: 'forwards',
            easing: "ease-in-out",
            duration: animation_1_duration,
        },
    );

    setTimeout(() => {
        sound_bonus.play();
    }, 320);

    setTimeout(() => {
        window_popup.animate(
            [
                { transform: 'scale(1.0)' },
                { transform: 'scale(0.8) rotate(10deg)' },
            ],
            {
                fill: 'forwards',
                easing: "ease-in-out",
                duration: hold_duration,
            },
        );
    }, animation_1_duration);



    // делаем popup добавленной звёздочки (+числоЗвёздочек) над счётчиком звёздочек.
    let width = document.getElementById('star_counter_container').getBoundingClientRect().width;
    let height = document.getElementById('star_counter_container').getBoundingClientRect().height;
    let left = document.getElementById('star_counter_container').getBoundingClientRect().left;
    let top = document.getElementById('star_counter_container').getBoundingClientRect().top;

    let offset_X = left + width / 2 - center_X;
    let offset_Y = top + height / 2 - center_Y;


    //console.log('window_stars_offset_X = ', offset_X, '   window_stars_offset_Y = ', offset_Y);


    setTimeout(() => {
        window_popup.animate(
            [
                { transform: 'scale(0.85) rotate(10deg)' },
                { transform: `translate(${offset_X}px, ${offset_Y}px) scale(0.2) rotate(200deg)` },
            ],
            {
                fill: 'forwards',
                //easing: "ease-in-out",
                duration: animation_2_duration,
            },
        );
    }, animation_1_duration + hold_duration);
}





// показывает поздравление из кучи сердечек после того как игрок смерджит 2 кокоса.
function show_final_hearts() {

    let hearts_count = 170; // количество всех сердечек которые появятся на экране в итоге.
    let heart_counter = 0;
    let setInterval_delay = 50;

    let id_setInterval = setInterval(() => {

        create_heart();

        heart_counter++;
        if (heart_counter > hearts_count) clearInterval(id_setInterval);
    }, setInterval_delay);
}


function create_heart() {

    let size_min = fruits[0].radius * scale_X * 1 / window.devicePixelRatio;
    let size_max = fruits[0].radius * scale_X * 1.5 / window.devicePixelRatio;
    let heart_size = get_random_float(size_min, size_max);

    let hue_min = 0;
    let hue_max = 80;
    let hue = get_random_integer(hue_min, hue_max);

    let opacity_min = 0.7;
    let opacity_max = 0.99;
    let opacity = get_random_float(opacity_min, opacity_max);


    let heart = document.createElement('img');
    document.body.append(heart);
    heart.src = 'images/heart.png';
    heart.style.width = heart_size + 'px';
    heart.style.position = 'absolute';
    heart.style.left = get_random_integer(
        heart_size,
        canvas_fruits.width / window.devicePixelRatio - heart_size
    ) + 'px';
    heart.style.top = get_random_integer(
        heart_size * 3,
        canvas_fruits.height / window.devicePixelRatio - heart_size
    ) + 'px';
    heart.style.zIndex = 101;
    heart.style.filter = 'hue-rotate(-' + hue + 'deg)';
    heart.style.opacity = opacity;
    heart.style.translate = '-50% -50%';
    heart.style.pointerEvents = 'none';


    let duration = 2000;


    x1 = 0;
    y1 = 100;
    x2 = -15;
    y2 = 0;
    x3 = 10;
    y3 = -100;
    x4 = 10;
    y4 = -180;
    x5 = 0;
    y5 = -250;


    let angle = 15;
    let angle_1 = angle;
    let angle_2 = angle;

    if (get_random_integer(1, 2) === 1) angle_1 *= -1;
    else angle_2 *= -1;

    heart.animate(
        [
            { transform: `scale(0) translate(${x1}%, ${y1}%) rotate(0deg)` },
            { transform: `scale(0.25) translate(${x2}%, ${y2}%) rotate(${angle_1}deg)` },
            { transform: `scale(0.5) translate(${x3}%, ${y3}%) rotate(${angle_2}deg)` },
            { transform: `scale(0.8) translate(${x4}%, ${y4}%) rotate(${angle_1}deg)`, opacity: 1 },
            { transform: `scale(1) translate(${x5}%, ${y5}%) rotate(${angle_2}deg)`, opacity: 0 },
        ],
        {
            fill: 'forwards',
            //easing: "ease-in-out",
            duration: duration,
        },
    );

    setTimeout(() => {
        heart.remove();
    }, duration);
}



// обновление размеров у всплывающего сообщения перед показом FullScreen-рекламы.
function refresh_sizes_of_prev_message_fullScreen_ads() {
    let title_text, button_text;

    if (language === languages.RU) {
        title_text = 'Рекламная пауза';
        button_text = 'Забрать ' + count_stars_after_FullScreen_ads;
    } else {
        title_text = 'Advertising break';
        button_text = 'Get ' + count_stars_after_FullScreen_ads;
    }

    let ads_message_title = document.getElementById('ads_message_title');
    let ads_message_button = document.getElementById('ads_message_button');
    let ads_message_button_img = document.getElementById('ads_message_button_img');

    ads_message_title.innerText = title_text;
    ads_message_button_text.innerText = button_text;

    let size = Math.min(gameField.height, gameField.width) / window.devicePixelRatio * 0.7;

    ads_message_title.style.fontSize = size * 0.1 + 'px';
    ads_message_title.style.maxWidth = size * 2 + 'px';
    ads_message_title.style.padding = size * 0.085 + 'px';
    ads_message_title.style.paddingTop = size * 0.025 + 'px';
    ads_message_title.style.paddingBottom = size * 0.04 + 'px';
    ads_message_title.style.borderWidth = size * 0.012 + 'px';
    ads_message_title.style.borderRadius = size * 0.2 + 'px';

    ads_message_button.style.fontSize = size * 0.1 + 'px';
    ads_message_button.style.maxWidth = size * 2 + 'px';
    ads_message_button.style.padding = size * 0.085 + 'px';
    ads_message_button.style.paddingTop = size * 0.025 + 'px';
    ads_message_button.style.paddingBottom = size * 0.04 + 'px';
    ads_message_button.style.borderWidth = size * 0.012 + 'px';
    ads_message_button.style.borderRadius = size * 0.2 + 'px';

    ads_message_button_img.style.width = size * 0.1 + 'px';
}



function show_FullScreen_ads() {

    console.log('Начало показа FullScreen-рекламы', performance.now());

    if (is_testing) return;

    if (platform === platforms.GAME_PUSH) {
        if (!gp.ads.isFullscreenAvailable) return;
    }

    document.getElementById('ads_message_container').style.visibility = 'visible';

    is_playing_FullScreen_or_Rewarded = true;

    // дважды ставим игру на паузу, но первый раз без отключения звука, чтобы звук клика произошёл, а то его не будет слышно.
    pause_game(false);

    sound_click.play();

    setTimeout(() => {
        pause_game(true);
    }, 300);

    setTimeout(() => {
        sound_add_score.play();
    }, 320);


    refresh_sizes_of_prev_message_fullScreen_ads();


    document.getElementById('dark_layer_2').animate(
        [
            { opacity: 0 },
            { opacity: 1, visibility: 'visible' },
        ],
        {
            fill: 'forwards',
            duration: 300,
        }
    );


    let ads_message_title = document.getElementById('ads_message_title');
    let ads_message_button = document.getElementById('ads_message_button');
    let ads_message_button_img = document.getElementById('ads_message_button_img');

    ads_message_button_img.className = 'stars_counter_image_star';


    document.getElementById('ads_message_container').style.display = 'flex';

    let width = canvas_gameField.width * 0.5;
    let duration_of_animation = 600;


    ads_message_title.animate(
        [
            { transform: `translateX(${-width}px)`, opacity: 0 },
            { transform: 'translateX(0px)' },
        ],
        {
            fill: 'backwards',
            duration: duration_of_animation,
            easing: 'ease',
        },
    );


    ads_message_button.animate(
        [
            { transform: `translateX(${-width}px)`, opacity: 0 },
            { transform: `translateX(0px)` },
        ],
        {
            fill: 'backwards',
            duration: duration_of_animation * 1.2,
            easing: 'ease',
        },
    );

    ads_message_button.className = 'pause_pulse_low';
}


// показывает сообщение поверх экрана.
function show_message(text) {

    let message = document.createElement('div');
    document.body.append(message);

    let size = gameField.width / window.devicePixelRatio * 0.05;
    let fontSize = size * 0.1;
    message.style.fontSize = size + 'px';
    message.style.textShadow = `${fontSize}px ${fontSize}px ${fontSize}px black`;
    message.style.fontFamily = 'Blogger_Sans-Bold, sans-serif';
    message.innerText = text;
    message.style.zIndex = 300;
    message.style.position = 'absolute';
    message.style.color = 'white';

    let duration = 10000;

    message.animate(
        [
            { transform: `translateY(0px)` },
            { transform: `translateY(${-size * 5}px)` },
        ],
        {
            //fill: 'backwards',
            fill: 'forwards',
            duration: duration,
            easing: 'ease',
        }
    );

    setTimeout(() => {
        message.remove();
    }, duration * 0.7);

}





// быстрое увеличение размера любого счётчика когда в него добавляются новые очки.
function fast_scale_of_counter(counter) {
    counter.animate(
        [
            { transform: 'scale(1)' },
            { transform: 'scale(1.35)' },
            { transform: 'scale(1)' },
        ],
        {
            fill: 'forwards',
            easing: 'ease-in-out',
            duration: 200, // 150
        },
    );
}




function test() {


    /* let a = {
        test1: 1,
        test2: 2,
    };
    let b = e?.test2;
    console.log(b); */





    /* let a = document.createElement('div');
    document.body.append(a);
    a.style.backgroundColor = 'yellow';
    a.style.position = 'absolute';

    let width = document.getElementById('star_counter_value').getBoundingClientRect().width;
    let height = document.getElementById('star_counter_value').getBoundingClientRect().height;
    let left = document.getElementById('star_counter_value').getBoundingClientRect().left;
    let top = document.getElementById('star_counter_value').getBoundingClientRect().top;

    //alert(top);

    a.style.width = width + 'px';
    a.style.height = '30px';

    let center = canvas_HUD.width / 2 / window.devicePixelRatio;

    a.style.left = center + 'px';
    a.style.top = '10px';
    a.style.border = '3px solid red'; */

    //a.style.transform = 'translate(-50%, -50%)';




    /* let s = localStorage.getItem('tri23_sounds_is_mute');

    console.log(check_string_is_boolean(s)); */


    //if (localStorage.getItem('tri23_fruit_0') === null || localStorage.getItem('tri23_fruit_0') === '') return false;


    //console.log(localStorage.getItem('tri23_sounds_is_mute'));


    /* let a = localStorage.getItem('tri23_score_current');

    //a = parseFloat(a);

    let b = parseFloat('4.s/.,3sd2adsasdafsdf');


    let s = '.1231';


    if (!check_string_is_number(s) === true) console.log('НЕ число'); */


    //console.log(typeof b);
}


// проверяет строку, только ли число в ней содержится. (true - только число, false - помимо цифр есть другие символы, точка не считается)
function check_string_is_number(s) {
    const isNumber = /^\d+(\.\d+)?$/.test(s.trim());
    return isNumber;
}

// проверяет строка это bool, т.е. true либо false. (true - значит bool, false - нет)
function check_string_is_boolean(s) {
    if (s === 'true' || s === 'false') return true;
    else return false;
}



// находит координаты pointer.x и pointer.y
function refresh_pointer_position(x, y) {

    let HUD_height = gameField.height * gameField.ratio_height_of_HUD_to_height_of_gameField;

    let id = pointer.fruit.current_id;

    y = HUD_height - fruits[id].radius * scale;

    let x1 = gameField.centerX - gameField.width / 2;
    let x2 = gameField.centerX + gameField.width / 2;

    x1 += fruits[id].radius * scale;
    x2 -= fruits[id].radius * scale;

    if (x < x1) x = x1;
    if (x > x2) x = x2;

    let position = get_physicCoords_from_canvasCoords(x, y);

    pointer.x = position[0];
    pointer.y = position[1];
}



// самый первый запуск игры игроком.
function first_start_game() {
    console.log('Самый первый запуск игры! --- ' + performance.now());
}

















// Функция-проверка
function checkSDKAndStart() {

    let delay = 10;

    if (is_testing) {
        Start_game();
        return;
    }

    if (platform === platforms.YANDEX_GAMES) {
        if (typeof YaGames !== 'undefined') {
            Start_game();
        } else {
            // Если SDK еще не готов, проверяем снова через 10мс.
            setTimeout(checkSDKAndStart, delay);
        }
    }

    if (platform === platforms.GAME_PUSH) {

    }
}

// точка входа. Запускаем проверку сразу после загрузки game.js
checkSDKAndStart();

