import Meetup from '../models/Meetup';
import File from '../models/File';

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

  async show(req, res) {
    const { id } = req.params;

    const meetup = await Meetup.findByPk(id, {
      include: [
        {
          model: File,
          as: 'file',
          attributes: ['id', 'name', 'path', 'url'],
        },
      ],
    });

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup does not exists' });
    }

    if (meetup.user_id !== req.userId) {
      return res.status(400).json({
        error: "You don't have permission to see meetup from other users",
      });
    }

    return res.json(meetup);
  }
}

export default new OrganizingController();
