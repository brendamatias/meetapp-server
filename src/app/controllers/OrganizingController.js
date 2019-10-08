import Meetup from '../models/Meetup';

class OrganizingController {
  async index(req, res) {
    const page = req.query.page || 1;

    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      limit: 5,
      offset: 10 * page - 10,
      order: [['date', 'DESC']],
    });

    return res.json(meetups);
  }
}

export default new OrganizingController();
