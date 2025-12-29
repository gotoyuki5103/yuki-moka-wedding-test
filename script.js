// CONFIGの初期値
const CONFIG = {
    sliders: {
        memories: { folder: 'images/memories', count: 0 },
        preshoot: { folder: 'images/preshoot', count: 0 }
    },
    autoPlayInterval: 4000,
    swipeThreshold: 50,
};

// --- スライダークラス ---
class Slider {
    constructor(containerId, dotsContainerId, slideClass, dotClass, folder, count) {
        this.containerId = containerId;
        this.dotsContainerId = dotsContainerId;
        this.slideClass = slideClass;
        this.dotClass = dotClass;
        this.folder = folder;
        this.count = count;
        this.currentIndex = 1;
        this.timer = null;
        this.touchStartX = 0;
        this.isTransitioning = false;
    }

    build() {
        const container = document.getElementById(this.containerId);
        const dotsContainer = document.getElementById(this.dotsContainerId);
        if (!container || !dotsContainer || this.count === 0) return;

        container.querySelectorAll(`.${this.slideClass}`).forEach(s => s.remove());
        dotsContainer.innerHTML = '';

        const slideFragment = document.createDocumentFragment();
        for (let i = 1; i <= this.count; i++) {
            const slide = document.createElement('div');
            slide.className = `${this.slideClass} fade-slide`;
            slide.style.display = i === 1 ? 'block' : 'none';
            const img = document.createElement('img');
            img.src = `${this.folder}/${String(i).padStart(2, '0')}.jpg`;
            img.loading = 'lazy';
            slide.appendChild(img);
            slideFragment.appendChild(slide);
        }
        const arrow = container.querySelector('.prev-arrow');
        arrow ? container.insertBefore(slideFragment, arrow) : container.appendChild(slideFragment);

        for (let i = 1; i <= this.count; i++) {
            const dot = document.createElement('button');
            dot.className = this.dotClass;
            if (i === 1) dot.classList.add('active-dot');
            dot.onclick = () => this.goToSlide(i);
            dotsContainer.appendChild(dot);
        }
        this.setupEventListeners(container);
    }

    setupEventListeners(container) {
        container.addEventListener('touchstart', (e) => { this.touchStartX = e.touches[0].clientX; this.stopAutoPlay(); }, { passive: true });
        container.addEventListener('touchend', (e) => {
            if (this.isTransitioning) return;
            const diff = this.touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > CONFIG.swipeThreshold) this.navigate(diff > 0 ? 1 : -1);
            this.startAutoPlay();
        }, { passive: true });
    }

    navigate(direction) { if (!this.isTransitioning) this.show(this.currentIndex + direction); }
    goToSlide(index) { if (!this.isTransitioning) this.show(index); }

    show(n) {
        const slides = document.getElementById(this.containerId).getElementsByClassName(this.slideClass);
        const dots = document.getElementById(this.dotsContainerId).getElementsByClassName(this.dotClass);
        if (slides.length === 0) return;

        if (n > slides.length) this.currentIndex = 1;
        else if (n < 1) this.currentIndex = slides.length;
        else this.currentIndex = n;

        Array.from(slides).forEach(s => s.style.display = 'none');
        Array.from(dots).forEach(d => d.classList.remove('active-dot'));

        slides[this.currentIndex - 1].style.display = 'block';
        dots[this.currentIndex - 1].classList.add('active-dot');

        this.isTransitioning = true;
        setTimeout(() => { this.isTransitioning = false; this.startAutoPlay(); }, 100);
    }

    startAutoPlay() { this.stopAutoPlay(); this.timer = setTimeout(() => this.show(this.currentIndex + 1), CONFIG.autoPlayInterval); }
    stopAutoPlay() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
}

let memoriesSlider, preshootSlider;

async function initPage() {
    try {
        const response = await fetch('config.json');
        const data = await response.json();

        // 1. Hero
        document.querySelector('.hero-title').textContent = data.content.hero.names;
        document.querySelector('.hero-date').textContent = `${data.content.hero.date} | ${data.content.hero.venue}`;

        // 2. Greeting
        document.querySelector('#greeting .greeting-text').innerHTML = data.content.greeting.text;

        // 3. Profile (項目の増減に対応)
        const profileSection = document.querySelector('#profile-list');
        profileSection.innerHTML = data.content.profiles.map(p => `
            <div class="profile-card">
                <img src="${p.image}" alt="${p.name}" class="profile-img">
                <h3 class="profile-name">${p.name}</h3>
                <p class="profile-desc">${p.desc}</p>
            </div>
        `).join('');

        // 4. Biography (項目の増減に対応)
        const renderBio = (list) => list.map(b => `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-info">
                    <span class="timeline-year">${b.year}</span>
                    <h4 class="timeline-title">${b.title}</h4>
                    <p>${b.text}</p>
                </div>
            </div>
        `).join('');
        document.getElementById('yuki-bio-list').innerHTML = renderBio(data.content.biography.yuki);
        document.getElementById('moka-bio-list').innerHTML = renderBio(data.content.biography.moka);

        // 5. Our Story (項目の増減に対応)
        document.getElementById('story-list').innerHTML = data.content.story.map(s => `
            <div class="story-item">
                <div class="story-img-box"><img src="${s.image}" alt=""></div>
                <div class="story-content">
                    <h4>${s.date} | ${s.title}</h4>
                    <p>${s.text}</p>
                </div>
            </div>
        `).join('');

        // 6. Sliders Init
        if(data.sliders) {
            Object.assign(CONFIG.sliders, data.sliders);
            memoriesSlider = new Slider('slideshow', 'dotsMemories', 'mySlides', 'dot', CONFIG.sliders.memories.folder, CONFIG.sliders.memories.count);
            memoriesSlider.build();
            preshootSlider = new Slider('slideshowPre', 'dotsPreshoot', 'mySlidesPre', 'dotPre', CONFIG.sliders.preshoot.folder, CONFIG.sliders.preshoot.count);
            preshootSlider.build();
        }

    } catch (e) { console.error("Config load error:", e); }
    hideLoading();
}

function plusSlides(n) { if (memoriesSlider) memoriesSlider.navigate(n); }
function plusSlidesPre(n) { if (preshootSlider) preshootSlider.navigate(n); }

// モーダルとタブの初期化
function initUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn, .bio-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        };
    });
    // ...モーダル制御（前述のコードと同様）
}

function hideLoading() { 
    const loader = document.getElementById('loadingOverlay');
    loader.style.opacity = '0'; 
    setTimeout(() => loader.style.display = 'none', 300); 
}

document.addEventListener('DOMContentLoaded', () => {
    initPage();
    // initUI等はそのまま
});
