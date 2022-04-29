const mongoCollections = require('../config/mongoCollections');
const professors = mongoCollections.professors;
const users = mongoCollections.users;
const { ObjectId } = require('mongodb');
const userData = require('../data/user')
const { check } = require('prettier');
const inputCheck = require('./inputCheck');

async function getAllProfessors() {
    const professorCollection = await professors();
    let professorList = await professorCollection
        .find({},{ 
            projection: { _id: 1, 
                            professorName: 1,
                            department: 1,
                            introduction: 1,
                            overallRating: 1,
                            picture: 1,
                        } }
        )
        .toArray();
    professorList.forEach(professor => {
        professor._id = professor._id.toString()
    })
    return professorList;
}

    /*
        Professor: {
            “_id”: ObjectId(“624724af974aef308ff7cc6a”),
            “professorName”: ​​“Patrick, Hill”,
            “department”: “Computer Science”,
            “introduction”: “Professor in the Computer Science department at Stevens Institute of 
                            Technology”
            “rating”: 4.5,
            “reviews” : ["62215a7ebd69a460a6193411", "62215a7ebd69a460a6193412"],
            “courses” : ["62215a7ebd69a460a6193413", "62215a7ebd69a460a6193414"],
            “picture”: “http://georgetownheckler.com/wp-content/uploads/2016/09/prof.jpg”
        }
    */
async function createProfessor(professorName, department, introduction, picture) {

    professorName = inputCheck.checkProfessorName(professorName);
    department = inputCheck.checkDepartment(department);
    introduction = inputCheck.checkIntroduction(introduction);
    picture = inputCheck.checkProfessorPicture(picture);

    const professorsCollection = await professors();
    let newProfessor = {
        professorName: professorName,
        department: department,
        introduction: introduction,
        picture: picture,
        reviews: [],
        courses: [],
        overallRating: null
    };

    const newInsertInformation = await professorsCollection.insertOne(newProfessor);
    if (newInsertInformation.insertedCount === 0) throw 'Insert failed!';
    return await this.getProfById(
        newInsertInformation.insertedId.toString()
    );
}

async function getProfById(id) {
    id = inputCheck.checkUserId(id);
    
    const profCollection = await professors();
    const professor = await profCollection.findOne({ _id: ObjectId(id) });
    if (!professor) throw 'Professor not found';
    professor._id = professor._id.toString()
    return professor;
}

async function getTop3Professors() {
    let professorList = await getAllProfessors();
    let res = professorList.sort((a, b) => b.overallRating - a.overallRating).slice(0,3);
    return res;
}

async function updateProf(id, updatedProf) {
    id = inputCheck.checkUserId(id);

    let profUpdateInfo = {
        professorName: updatedProf.professorName,
        department: updatedProf.department,
        introduction: updatedProf.introduction,
        picture: updatedProf.picture,
        // delete review?
    };
    const profCollection = await professors();
    const updateInfo = await profCollection.updateOne(
        { _id: ObjectId(id) },
        { $set: profUpdateInfo }
    );
    if (!updateInfo.matchedCount && !updateInfo.modifiedCount)
        throw 'Update failed';
    return await this.getProfById(id);
}

async function removeProf(id) {
    id = inputCheck.checkUserId(id)

    const profCollection = await professors();
    const deletionInfo = await profCollection.deleteOne({
        _id: ObjectId(id),
    });
    if (deletionInfo.deletedCount === 0) {
        throw `Could not delete professor with id of ${id}`;
    }
    return { deleted: true };
}

    /* 
    ProfessoReview: {
        “_id”: ObjectId(“624724af974aef308ff7cc6b”),
        “userId”: "62215a7ebd69a460a6193418",
        “professorId”: "624724af974aef308ff7cc6a",
        “comment”: “At first I thought Hill was super arrogant, and was about to give a low score. 
            But now, having taken both CS546 and CS554, I think that these classes prepared 
            me more than anything for the workforce. Even if the assignments can be a heavy 
            load at times, nothing ever felt unfair. I've also thought Hill is likable now, despite 
            my initial reaction.”
        “rating”: 5
    }
    */

async function addProfReview(uid, pid, comment, rating) {

    uid = inputCheck.checkUserId(uid);
    pid = inputCheck.checkUserId(pid);
    comment = inputCheck.checkComment(comment);
    rating = inputCheck.checkRating(rating);

    const userCollection = await users();
    const profCollection = await professors();
    const user = await userData.getUser(uid)

    const profReview = {
        _id: ObjectId().toString(),
        userId: uid,
        professorId: pid,
        username: user.username,
        comment: comment,
        rating: rating,
    };

    // insert review into user
    const userUpdateInfo = await userCollection.updateOne(
        { _id: ObjectId(uid) },
        { $push: { reviews: profReview } }
    );
    if (!userUpdateInfo.modifiedCount && !userUpdateInfo.matchedCount)
        throw `No user found with ID of ${uid}`;

    // insert prof review into professor
    const profUpdateInfo = await profCollection.updateOne(
        { _id: ObjectId(pid) },
        { $push: { reviews: profReview } }
    );
    if (!profUpdateInfo.modifiedCount && !profUpdateInfo.matchedCount)
        throw `No professor found with ID of ${pid}`;

    // set average rating
    await profCollection.updateOne({ _id: ObjectId(pid) }, [
        { $set: { rating: { $avg: '$reviews.rating' } } },
    ]);

    

    return profReview;
}

async function removeProfReview(id) {
    id = inputCheck.checkUserId(id);

    const profCollection = await professors();
    // find out the professor document this review belongs to
    const prof = await profCollection.findOne({ 'reviews._id': { $eq: ObjectId(id) }});
    if(!prof) throw "review does not exist";

        // delete the review from the reviews
    await profCollection.updateOne({ _id: prof._id }, { $pull: { reviews: { _id: ObjectId(id)}}})

    // re-calculate avg rating
    await profCollection.updateOne({ _id: ObjectId(prof._id)}, [{$set: {rating: {$avg: "$reviews.rating"}}}])
    return { deleted: true };
}

module.exports = {
    getAllProfessors,
    createProfessor,
    getProfById,
    getTop3Professors,
    updateProf,
    removeProf,
    addProfReview,
    removeProfReview,
};