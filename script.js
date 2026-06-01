import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 파이어베이스 설정 정보
const firebaseConfig = {
    apiKey: "AIzaSyDJUxYwL2yUq0aGTFH_DFeCNNNVE8henMM",
    authDomain: "food26-61be8.firebaseapp.com",
    projectId: "food26-61be8",
    storageBucket: "food26-61be8.firebasestorage.app",
    messagingSenderId: "503631542022",
    appId: "1:503631542022:web:9119acf97d8937fbf9d087"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const API_KEY = "167317ab910f421c85c88e20e02d508e"; 
const ATPT_OFCDC_SC_CODE = "I10"; 
const SD_SCHUL_CODE = "9300181";   

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');

const fromDate = `${yyyy}${mm}01`; 
const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
const toDate = `${yyyy}${mm}${String(lastDay).padStart(2, '0')}`; 
const todayStr = `${yyyy}${mm}${dd}`;

// 달력 기본값을 오늘 날짜로 셋팅 (YYYY-MM-DD 형식)
const dateSelector = document.getElementById('date-selector');
dateSelector.value = `${yyyy}-${mm}-${dd}`;

const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_FROM_YMD=${fromDate}&MLSV_TO_YMD=${toDate}&pSize=100`;

const mealFeedEl = document.getElementById('meal-feed');
let swiperInstance = null; // Swiper 인스턴스를 저장할 변수
let dateToSlideIndex = {}; // 날짜문자열(예:20260527)과 슬라이드 번호(index) 매핑 테이블

fetch(url)
    .then(response => response.json())
    .then(data => {
        if (!data.mealServiceDietInfo) {
            mealFeedEl.innerHTML = `<div class="state-msg">등록된 급식 정보가 없습니다. 😴</div>`;
            return;
        }

        const mealRows = data.mealServiceDietInfo[1].row;
        mealFeedEl.innerHTML = ''; 

        const groupedMeals = {};
        mealRows.forEach(row => {
            const mealDate = row.MLSV_YMD;
            if (!groupedMeals[mealDate]) groupedMeals[mealDate] = [];
            groupedMeals[mealDate].push({
                type: row.MMEAL_SC_NM, 
                menu: row.DDISH_NM
            });
        });

        const sortedDates = Object.keys(groupedMeals).sort();
        let todaySlideIndex = 0; // 오늘 날짜 카드가 들어갈 슬라이드 순번 위치 기억용

        sortedDates.forEach((mealDate, index) => {
            const meals = groupedMeals[mealDate]; 
            const displayDate = `${mealDate.substring(4,6)}월 ${mealDate.substring(6,8)}일`;

            // 🗺️ 날짜와 슬라이드 인덱스 번호를 기록해 둡니다. (달력 이동용)
            dateToSlideIndex[mealDate] = index;

            if (mealDate === todayStr) {
                todaySlideIndex = index; // 오늘 날짜의 슬라이드 번호 확정
            }

            // Swiper 규칙: 슬라이드는 무조건 'swiper-slide' 클래스 명을 가진 박스여야 합니다.
            const slide = document.createElement('div');
            slide.classList.add('swiper-slide');

            const card = document.createElement('div');
            card.classList.add('meal-card');
            if (mealDate === todayStr) card.classList.add('today');

            let allMealsHtml = '';
            
            meals.forEach((meal) => {
                const cleanMenu = meal.menu.replace(/[0-9]+\./g, '');
                const menuItems = cleanMenu.split('<br/>');
                
                let menuListHtml = '';
                menuItems.forEach(item => {
                    if(item.trim()) menuListHtml += `<li>• ${item.trim()}</li>`;
                });

                const commentId = `${mealDate}-${meal.type}`;

                allMealsHtml += `
                    <div class="meal-section">
                        <span class="meal-type">${meal.type}</span>
                        <ul class="menu-list">
                            ${menuListHtml}
                        </ul>
                        
                        <div class="comment-box">
                            <ul class="comment-list" id="list-${commentId}">
                                <li style="color:#94a3b8; font-size:0.85rem;">리뷰를 불러오는 중...</li>
                            </ul>
                            <div class="comment-input-group">
                                <select class="star-select" id="star-${commentId}">
                                    <option value="5">★ 5</option>
                                    <option value="4">★ 4</option>
                                    <option value="3">★ 3</option>
                                    <option value="2">★ 2</option>
                                    <option value="1">★ 1</option>
                                </select>
                                <input type="text" class="comment-input" id="input-${commentId}" placeholder="함께 볼 리뷰를 남겨주세요!">
                                <button class="comment-btn" data-id="${commentId}">등록</button>
                            </div>
                        </div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="meal-date">
                    <span>📅 ${displayDate}</span>
                    ${mealDate === todayStr ? '<span class="today-badge">오늘</span>' : ''}
                </div>
                ${allMealsHtml}
            `;

            slide.appendChild(card);
            mealFeedEl.appendChild(slide);

            meals.forEach(meal => {
                const commentId = `${mealDate}-${meal.type}`;
                loadServerComments(commentId);
            });
        });

        // 🎹 [중요] 카드가 완전히 화면에 다 그려진 후 Swiper 작동 엔진을 켭니다.
        swiperInstance = new Swiper('.swiper', {
            direction: 'horizontal',
            loop: false, // 달력 이동 로직의 정확성을 위해 false 설정
            initialSlide: todaySlideIndex, // 🌟 핵심: 접속하자마자 오늘 날짜 카드로 포커싱 활성화
            spaceBetween: 30, // 카드와 카드 사이 공백 크기
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });

        // 슬라이드가 넘어갈 때마다 상단 달력의 날짜도 자동으로 변경해 주는 기능 추가
        swiperInstance.on('slideChange', () => {
            const activeIndex = swiperInstance.activeIndex;
            const activeDateStr = sortedDates[activeIndex]; // 현재 보이는 슬라이드의 YYYYMMDD 값 추출
            
            if(activeDateStr) {
                const formattedDate = `${activeDateStr.substring(0,4)}-${activeDateStr.substring(4,6)}-${activeDateStr.substring(6,8)}`;
                dateSelector.value = formattedDate;
            }
        });

        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-id');
                addServerComment(commentId);
            });
        });
    })
    .catch(error => {
        console.error("Error:", error);
        mealFeedEl.innerHTML = `<div class="state-msg" style="color: #ef4444;">데이터를 동기화하지 못했습니다.</div>`;
    });

// 📆 [상단 달력 입력/변경 시 해당 날짜 슬라이드로 순간 이동하는 기능]
dateSelector.addEventListener('change', (e) => {
    const selectedDate = e.target.value.replace(/-/g, ''); // '2026-05-27' -> '20260527'
    
    if (selectedDate in dateToSlideIndex) {
        const targetIndex = dateToSlideIndex[selectedDate];
        swiperInstance.slideTo(targetIndex, 400); // 400ms(0.4초) 동안 부드럽게 해당 카드로 슬라이딩 이동!
    } else {
        alert("해당 날짜의 급식 데이터가 존재하지 않습니다.");
    }
});

// [파이어베이스 함수 기본 유지]
async function addServerComment(commentId) {
    const inputEl = document.getElementById(`input-${commentId}`);
    const starEl = document.getElementById(`star-${commentId}`);
    const text = inputEl.value.trim();
    const star = parseInt(starEl.value);

    if (!text) {
        alert("리뷰 내용을 입력해주세요!");
        return;
    }

    try {
        await addDoc(collection(db, "comments"), {
            commentId: commentId,
            text: text,
            star: star,
            createdAt: new Date()
        });

        inputEl.value = '';
        loadServerComments(commentId); 
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

async function loadServerComments(commentId) {
    const listEl = document.getElementById('list-' + commentId);
    if (!listEl) return;

    try {
        const q = query(
            collection(db, "comments"), 
            where("commentId", "==", commentId),
            orderBy("createdAt", "asc")
        );
        
        const querySnapshot = await getDocs(q);
        listEl.innerHTML = ''; 

        if (querySnapshot.empty) {
            listEl.innerHTML = `<li style="color:#cbd5e1; font-size:0.85rem; font-style:italic;">가장 먼저 리뷰를 남겨보세요!</li>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const comment = docSnap.data();
            const docId = docSnap.id; 

            const li = document.createElement('li');
            li.classList.add('comment-item');
            
            const starString = '★'.repeat(comment.star) + '☆'.repeat(5 - comment.star);

            li.innerHTML = `
                <div>
                    <span>${comment.text}</span>
                    <span class="stars" style="margin-left:8px;">${starString}</span>
                </div>
                <span class="delete-btn" style="cursor:pointer; color:#ef4444; font-weight:bold;">❌</span>
            `;

            li.querySelector('.delete-btn').addEventListener('click', () => {
                deleteServerComment(commentId, docId);
            });

            listEl.appendChild(li);
        });
    } catch (e) {
        console.error("Error loading documents: ", e);
        listEl.innerHTML = `<li style="color:#ef4444; font-size:0.85rem;">리뷰 로드 실패</li>`;
    }
}

async function deleteServerComment(commentId, docId) {
    if (!confirm("이 리뷰를 삭제하시겠습니까? (서버에서 완전히 삭제됩니다)")) return;

    try {
        await deleteDoc(doc(db, "comments", docId));
        loadServerComments(commentId); 
    } catch (e) {
        console.error("Error removing document: ", e);
        alert("삭제 권한이 없거나 내부 오류가 발생했습니다.");
    }
}