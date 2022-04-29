const express = require('express');
const router = express.Router();
const professor = require('../data/professor');
const user = require('../data/user');
const inputCheck = require('../data/inputCheck');


router.delete('/:id', async (req, res) => {  //半成品
    const professorId = req.params.id;
    try {
        removeProfessorStatus = await professor.removeProf(professorId);
    } catch (e) {
        res.status(500).json(e);
        return
    }
    
    res.status(200).json({removeProfessorStatus });
    
    
});







module.exports = router;