require('dotenv').config();
const express = require('express');
const db = require('./db');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

// ✅ 0. 메인 페이지 (포트폴리오 대문) [추가된 부분]
// 접속 주소: http://localhost:3000/
app.get('/', (req, res) => {
    // views 폴더 안에 index.ejs 파일이 있어야 합니다.
    res.render('index'); 
});

// ✅ 1. 게시글 목록 (경로 변경: / -> /board)
// 접속 주소: http://localhost:3000/board
app.get('/board', async (req, res) => {
    let page = parseInt(req.query.page) || 1; // 현재 페이지 (기본 1)
    let keyword = req.query.search || '';     // 검색어
    const limit = 10;                         // 한 페이지당 게시글 수
    const offset = (page - 1) * limit;

    try {
        let sql = "SELECT * FROM posts";
        let countSql = "SELECT COUNT(*) as count FROM posts";
        let params = [];

        // 검색 기능 (제목 검색)
        if (keyword) {
            sql += " WHERE title LIKE ?";
            countSql += " WHERE title LIKE ?";
            params.push(`%${keyword}%`);
        }

        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        // 전체 게시글 수 조회 (페이징 계산용)
        const [countRows] = await db.query(countSql, keyword ? [`%${keyword}%`] : []);
        const totalPosts = countRows[0].count;
        const totalPages = Math.ceil(totalPosts / limit);

        // 게시글 데이터 조회
        const [posts] = await db.query(sql, params);

        res.render('list', { 
            posts, 
            page, 
            totalPages, 
            keyword 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("DB Error");
    }
});

// ✅ 2. 글쓰기 페이지
app.get('/write', (req, res) => {
    res.render('write');
});

// ✅ 3. 게시글 등록
app.post('/write', async (req, res) => {
    const { title, author, content } = req.body;
    try {
        await db.query("INSERT INTO posts (title, author, content) VALUES (?, ?, ?)", [title, author, content]);
        // [수정] 글 작성 후 게시판 목록(/board)으로 이동
        res.redirect('/board'); 
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ✅ 4. 게시글 상세 보기 (조회수 증가 포함)
app.get('/post/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 조회수 1 증가
        await db.query("UPDATE posts SET views = views + 1 WHERE id = ?", [id]);
        
        // 게시글 가져오기
        const [rows] = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
        res.render('detail', { post: rows[0] });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ✅ 5. 수정 페이지
app.get('/edit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
        res.render('edit', { post: rows[0] });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ✅ 6. 게시글 수정 처리
app.put('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, content } = req.body;
    try {
        await db.query("UPDATE posts SET title = ?, author = ?, content = ? WHERE id = ?", [title, author, content, id]);
        res.redirect(`/post/${id}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ✅ 7. 게시글 삭제
app.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM posts WHERE id = ?", [id]);
        // [수정] 삭제 후 게시판 목록(/board)으로 이동
        res.redirect('/board');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 포트폴리오 서버 실행 중: http://localhost:${PORT}`);
});