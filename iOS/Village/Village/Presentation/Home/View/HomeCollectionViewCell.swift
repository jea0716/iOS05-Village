//
//  HomeCollectionViewCell.swift
//  Village
//
//  Created by 박동재 on 2023/11/15.
//

import UIKit

final class HomeCollectionViewCell: UICollectionViewCell {
    
    static let identifier = "HomeCollectionViewCell"
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setUI()
    }
    
    private let postImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.contentMode = .scaleAspectFit
        imageView.layer.cornerRadius = 16
        
        return imageView
    }()
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 16, weight: .bold)
        
        return label
    }()
    
    private let priceLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 14, weight: .bold)
        
        return label
    }()
    
    private let accessoryView: UIImageView = {
        let imageView = UIImageView()
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.image = UIImage(systemName: ImageSystemName.chevronRight.rawValue)
        
        return imageView
    }()
    
    private func setUI() {
        self.addSubview(postImageView)
        self.addSubview(titleLabel)
        self.addSubview(priceLabel)
        self.addSubview(accessoryView)
        configureConstraints()
    }
    
    private func configureConstraints() {
        NSLayoutConstraint.activate([
            postImageView.centerYAnchor.constraint(equalTo: self.centerYAnchor),
            postImageView.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 10),
            postImageView.widthAnchor.constraint(equalToConstant: 80),
            postImageView.heightAnchor.constraint(equalToConstant: 80)
        ])
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: self.topAnchor, constant: 25),
            titleLabel.leadingAnchor.constraint(equalTo: postImageView.trailingAnchor, constant: 20)
        ])
        
        NSLayoutConstraint.activate([
            priceLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 10),
            priceLabel.leadingAnchor.constraint(equalTo: postImageView.trailingAnchor, constant: 20)
        ])
        
        NSLayoutConstraint.activate([
            accessoryView.centerYAnchor.constraint(equalTo: self.centerYAnchor),
            accessoryView.trailingAnchor.constraint(equalTo: self.trailingAnchor, constant: -16)
        ])
    }
    
    func configureData(post: Post) {
        titleLabel.text = post.title
        let price = post.price.map(String.init) ?? ""
        priceLabel.text = price != "" ? "\(price)원" : ""
    }
    
    func configureImage(image: UIImage?) {
        if image != nil {
            postImageView.image = image
        } else {
            postImageView.image = UIImage(systemName: ImageSystemName.photo.rawValue)
            postImageView.backgroundColor = .primary100
        }
    }
}
